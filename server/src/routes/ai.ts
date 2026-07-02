import { Router } from "express";
import { db } from "../db";
import { filesTable, reposTable, chatsTable, activityTable } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { ExplainFileBody, SendChatMessageBody } from "../zod";
import { chatCompletion } from "../lib/openai";
import { logger } from "../lib/logger";

const router = Router();

// POST /repos/:id/explain-file
router.post("/repos/:id/explain-file", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repoId = parseInt(req.params.id);
  const parsed = ExplainFileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { fileId, detailed } = parsed.data;

  const [file] = await db.select().from(filesTable).where(and(eq(filesTable.id, fileId), eq(filesTable.repoId, repoId))).limit(1);
  if (!file || !file.content) { res.status(404).json({ error: "File not found" }); return; }

  const prompt = detailed
    ? `Analyze this code file in detail. File: ${file.path}\n\nProvide:\n1. A beginner-friendly explanation of what this file does\n2. A brief summary (2-3 sentences)\n3. List of key functions/classes with descriptions\n\nCode:\n\`\`\`${file.language || ""}\n${file.content.slice(0, 8000)}\n\`\`\``
    : `Explain this code file simply. File: ${file.path}\n\nCode:\n\`\`\`${file.language || ""}\n${file.content.slice(0, 6000)}\n\`\`\`\n\nProvide: 1) What it does in plain English, 2) Key functions/classes, 3) A one-sentence summary.`;

  try {
    const explanation = await chatCompletion([
      { role: "system", content: "You are a senior software engineer explaining code to beginners. Be clear, concise, and use simple language." },
      { role: "user", content: prompt },
    ], 1500);

    await db.update(filesTable).set({ explanation }).where(eq(filesTable.id, fileId));

    await db.insert(activityTable).values({
      userId: req.userId!,
      repoId,
      type: "file_explained",
      description: `Explained ${file.name}`,
    });

    // Extract function list from explanation heuristically
    const functionMatches = explanation.match(/(?:function|method|class|component|hook)\s+`?(\w+)`?/gi) || [];
    const functions = functionMatches.slice(0, 10).map((m) => ({
      name: m.split(/\s+/).pop() || m,
      description: "See explanation above",
    }));

    res.json({
      fileId,
      explanation,
      summary: explanation.split("\n").find((l) => l.trim().length > 20) || explanation.slice(0, 200),
      functions,
    });
  } catch (err) {
    logger.error({ err }, "Explain file failed");
    res.status(500).json({ error: "AI analysis failed" });
  }
});

// GET /repos/:id/architecture
router.get("/repos/:id/architecture", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repoId = parseInt(req.params.id);
  const [repo] = await db.select().from(reposTable).where(eq(reposTable.id, repoId)).limit(1);
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }

  if (repo.architectureCache) {
    res.json(JSON.parse(repo.architectureCache));
    return;
  }

  const files = await db.select({ path: filesTable.path, type: filesTable.type, language: filesTable.language })
    .from(filesTable).where(eq(filesTable.repoId, repoId)).limit(200);

  const fileList = files.map((f) => `${f.type === "directory" ? "[DIR]" : "[FILE]"} ${f.path}`).join("\n");

  // Get sample content from key files
  const keyFiles = await db.select().from(filesTable)
    .where(and(eq(filesTable.repoId, repoId), eq(filesTable.type, "file")))
    .limit(5);
  const sampleContent = keyFiles.map((f) => `--- ${f.path} ---\n${(f.content || "").slice(0, 1000)}`).join("\n\n");

  try {
    const result = await chatCompletion([
      { role: "system", content: "You are a software architect. Analyze codebases and explain them clearly." },
      { role: "user", content: `Analyze this ${repo.language || "unknown"} project structure and provide a JSON response with these exact keys: overview, folderStructure, dataFlow, authFlow, apiExplanation, techStack (array of strings).\n\nProject: ${repo.name}\nFile structure:\n${fileList}\n\nSample files:\n${sampleContent}\n\nRespond ONLY with valid JSON.` },
    ], 2000);

    let architecture;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      architecture = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        overview: result,
        folderStructure: fileList,
        dataFlow: "Analysis unavailable",
        authFlow: "Analysis unavailable",
        apiExplanation: "Analysis unavailable",
        techStack: [repo.language || "Unknown"],
      };
    } catch {
      architecture = {
        overview: result,
        folderStructure: fileList,
        dataFlow: "Unable to parse",
        authFlow: "Unable to parse",
        apiExplanation: "Unable to parse",
        techStack: [repo.language || "Unknown"],
      };
    }

    await db.update(reposTable).set({ architectureCache: JSON.stringify(architecture) }).where(eq(reposTable.id, repoId));
    res.json(architecture);
  } catch (err) {
    logger.error({ err }, "Architecture analysis failed");
    res.status(500).json({ error: "AI analysis failed" });
  }
});

// GET /repos/:id/readme
router.get("/repos/:id/readme", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repoId = parseInt(req.params.id);
  const [repo] = await db.select().from(reposTable).where(eq(reposTable.id, repoId)).limit(1);
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }

  if (repo.readmeCache) {
    res.json({ content: repo.readmeCache, repoId });
    return;
  }

  const files = await db.select({ path: filesTable.path, language: filesTable.language })
    .from(filesTable).where(and(eq(filesTable.repoId, repoId), eq(filesTable.type, "file"))).limit(100);
  const fileList = files.map((f) => f.path).join("\n");

  try {
    const readme = await chatCompletion([
      { role: "system", content: "You are a technical writer. Generate professional, well-structured README files in Markdown." },
      { role: "user", content: `Generate a professional README.md for this project:\n\nProject name: ${repo.name}\nLanguage: ${repo.language || "Unknown"}\nDescription: ${repo.description || "A software project"}\nStars: ${repo.stars || 0}\nFiles:\n${fileList}\n\nInclude: title, description, features, tech stack, installation steps, usage, API routes (if applicable), contributing guide, and license section.` },
    ], 2000);

    await db.update(reposTable).set({ readmeCache: readme }).where(eq(reposTable.id, repoId));

    await db.insert(activityTable).values({
      userId: req.userId!,
      repoId,
      type: "readme_generated",
      description: `Generated README for ${repo.name}`,
    });

    res.json({ content: readme, repoId });
  } catch (err) {
    logger.error({ err }, "README generation failed");
    res.status(500).json({ error: "AI generation failed" });
  }
});

// GET /repos/:id/complexity
router.get("/repos/:id/complexity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repoId = parseInt(req.params.id);
  const [repo] = await db.select().from(reposTable).where(eq(reposTable.id, repoId)).limit(1);
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }

  if (repo.complexityCache) {
    res.json(JSON.parse(repo.complexityCache));
    return;
  }

  const files = await db.select().from(filesTable)
    .where(and(eq(filesTable.repoId, repoId), eq(filesTable.type, "file")))
    .limit(200);

  const fileSizes = files
    .filter((f) => f.content)
    .map((f) => ({ path: f.path, lines: (f.content || "").split("\n").length }))
    .sort((a, b) => b.lines - a.lines);

  const largeFiles = fileSizes.slice(0, 10).map((f) => ({
    path: f.path,
    lines: f.lines,
    complexity: f.lines > 500 ? "High" : f.lines > 200 ? "Medium" : "Low",
  }));

  const totalLines = fileSizes.reduce((s, f) => s + f.lines, 0);
  const avgLines = fileSizes.length ? Math.round(totalLines / fileSizes.length) : 0;
  const score = Math.min(100, Math.max(0, 100 - Math.round((avgLines / 300) * 50 + (largeFiles.filter(f => f.complexity === "High").length / files.length) * 50)));

  try {
    const aiSuggestions = await chatCompletion([
      { role: "system", content: "You are a code reviewer. Provide concise optimization suggestions." },
      { role: "user", content: `Project: ${repo.name} (${repo.language})\nTotal files: ${files.length}\nLargest files: ${largeFiles.map(f => `${f.path} (${f.lines} lines)`).join(", ")}\n\nGive 5 specific optimization suggestions as a JSON array of strings.` },
    ], 500);

    let optimizations: string[] = [];
    try {
      const match = aiSuggestions.match(/\[[\s\S]*\]/);
      if (match) optimizations = JSON.parse(match[0]);
    } catch {
      optimizations = ["Consider breaking large files into smaller modules", "Add unit tests for complex functions", "Remove duplicate code patterns", "Add documentation to public APIs", "Consider lazy loading for large modules"];
    }

    const result = {
      score,
      largeFiles,
      optimizations,
      summary: `This project has ${files.length} files with an average of ${avgLines} lines per file. Complexity score: ${score}/100.`,
    };

    await db.update(reposTable).set({ complexityCache: JSON.stringify(result) }).where(eq(reposTable.id, repoId));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Complexity analysis failed");
    res.status(500).json({ error: "Analysis failed" });
  }
});

// GET /repos/:id/interview-questions
router.get("/repos/:id/interview-questions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repoId = parseInt(req.params.id);
  const [repo] = await db.select().from(reposTable).where(eq(reposTable.id, repoId)).limit(1);
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }

  if (repo.interviewCache) {
    res.json(JSON.parse(repo.interviewCache));
    return;
  }

  const files = await db.select({ path: filesTable.path, content: filesTable.content })
    .from(filesTable).where(and(eq(filesTable.repoId, repoId), eq(filesTable.type, "file"))).limit(10);
  const sampleContent = files.map((f) => `${f.path}:\n${(f.content || "").slice(0, 500)}`).join("\n\n");

  try {
    const aiResult = await chatCompletion([
      { role: "system", content: "You are a technical interviewer generating questions about a codebase." },
      { role: "user", content: `Generate 10 technical interview questions about this ${repo.language || ""} codebase.\n\nProject: ${repo.name}\nSample code:\n${sampleContent}\n\nReturn JSON array where each item has: question (string), difficulty ("easy"|"medium"|"hard"), category (string), hint (string).` },
    ], 1500);

    let questions: Array<{ question: string; difficulty: string; category: string; hint: string }> = [];
    try {
      const match = aiResult.match(/\[[\s\S]*\]/);
      if (match) questions = JSON.parse(match[0]);
    } catch {
      questions = [
        { question: `What is the main purpose of the ${repo.name} project?`, difficulty: "easy", category: "Overview", hint: "Look at the README and main entry files" },
        { question: "How is authentication handled in this codebase?", difficulty: "medium", category: "Security", hint: "Check middleware and auth-related files" },
        { question: "Describe the data flow in this application.", difficulty: "hard", category: "Architecture", hint: "Trace from API endpoints to database" },
      ];
    }

    const result = { questions };
    await db.update(reposTable).set({ interviewCache: JSON.stringify(result) }).where(eq(reposTable.id, repoId));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Interview questions failed");
    res.status(500).json({ error: "AI generation failed" });
  }
});

// GET /repos/:id/chat
router.get("/repos/:id/chat", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repoId = parseInt(req.params.id);
  const messages = await db.select().from(chatsTable)
    .where(and(eq(chatsTable.repoId, repoId), eq(chatsTable.userId, req.userId!)))
    .orderBy(desc(chatsTable.createdAt))
    .limit(50);
  res.json(messages.reverse().map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    repoId: m.repoId,
    createdAt: m.createdAt.toISOString(),
  })));
});

// POST /repos/:id/chat
router.post("/repos/:id/chat", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repoId = parseInt(req.params.id);
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { message } = parsed.data;

  const [repo] = await db.select().from(reposTable).where(eq(reposTable.id, repoId)).limit(1);
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }

  // Get relevant file content for context
  const files = await db.select({ path: filesTable.path, content: filesTable.content, language: filesTable.language })
    .from(filesTable).where(and(eq(filesTable.repoId, repoId), eq(filesTable.type, "file"))).limit(20);
  const codeContext = files.map((f) => `File: ${f.path}\n\`\`\`${f.language || ""}\n${(f.content || "").slice(0, 1000)}\n\`\`\``).join("\n\n");

  // Get recent chat history
  const history = await db.select().from(chatsTable)
    .where(and(eq(chatsTable.repoId, repoId), eq(chatsTable.userId, req.userId!)))
    .orderBy(desc(chatsTable.createdAt)).limit(10);

  const historyMessages = history.reverse().map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    const aiResponse = await chatCompletion([
      {
        role: "system",
        content: `You are an expert code assistant helping a developer understand a ${repo.language || ""} codebase called "${repo.name}". Answer questions clearly and reference specific files when relevant.\n\nCodebase context:\n${codeContext.slice(0, 6000)}`,
      },
      ...historyMessages,
      { role: "user", content: message },
    ], 1000);

    // Save both messages
    await db.insert(chatsTable).values({ repoId, userId: req.userId!, role: "user", content: message });
    const [assistantMsg] = await db.insert(chatsTable).values({
      repoId,
      userId: req.userId!,
      role: "assistant",
      content: aiResponse,
    }).returning();

    await db.insert(activityTable).values({
      userId: req.userId!,
      repoId,
      type: "chat_sent",
      description: `Chat: ${message.slice(0, 60)}`,
    });

    res.json({
      id: assistantMsg.id,
      role: "assistant",
      content: aiResponse,
      repoId,
      createdAt: assistantMsg.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Chat failed");
    res.status(500).json({ error: "AI response failed" });
  }
});

export default router;
