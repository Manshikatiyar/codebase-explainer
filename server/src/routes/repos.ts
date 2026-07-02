import { Router } from "express";
import { db } from "../db";
import { reposTable, filesTable, activityTable } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { AnalyzeRepoBody, UploadZipBody } from "../zod";
import { parseGithubUrl, fetchRepoMeta, fetchContributorCount, fetchRepoTree, fetchFileContent, isTextFile, detectLanguage } from "../lib/github";
import { extractZip } from "../lib/zipExtract";
import { logger } from "../lib/logger";

const router = Router();

function formatRepo(r: typeof reposTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    url: r.url ?? null,
    description: r.description ?? null,
    language: r.language ?? null,
    stars: r.stars ?? null,
    forks: r.forks ?? null,
    contributors: r.contributors ?? null,
    status: r.status,
    isBookmarked: r.isBookmarked,
    sourceType: r.sourceType,
    fileCount: r.fileCount ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/repos", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repos = await db
    .select()
    .from(reposTable)
    .where(eq(reposTable.userId, req.userId!))
    .orderBy(desc(reposTable.createdAt));
  res.json(repos.map(formatRepo));
});

router.post("/repos", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = AnalyzeRepoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { url, name } = parsed.data;
  const parsed_url = parseGithubUrl(url);
  if (!parsed_url) {
    res.status(400).json({ error: "Invalid GitHub URL" });
    return;
  }
  const repoName = name || `${parsed_url.owner}/${parsed_url.repo}`;

  const [repo] = await db.insert(reposTable).values({
    userId: req.userId!,
    name: repoName,
    url,
    status: "analyzing",
    sourceType: "github",
  }).returning();

  // Kick off async analysis (fire and forget)
  analyzeGithubRepo(repo.id, parsed_url.owner, parsed_url.repo, req.userId!).catch((err) => {
    logger.error({ err, repoId: repo.id }, "Analysis failed");
  });

  await db.insert(activityTable).values({
    userId: req.userId!,
    repoId: repo.id,
    type: "repo_analyzed",
    description: `Started analyzing ${repoName}`,
  });

  res.status(201).json(formatRepo(repo));
});

router.get("/repos/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [repo] = await db.select().from(reposTable).where(and(eq(reposTable.id, id), eq(reposTable.userId, req.userId!))).limit(1);
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatRepo(repo));
});

router.delete("/repos/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(filesTable).where(eq(filesTable.repoId, id));
  await db.delete(reposTable).where(and(eq(reposTable.id, id), eq(reposTable.userId, req.userId!)));
  res.status(204).send();
});

router.post("/repos/:id/bookmark", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [repo] = await db.select().from(reposTable).where(and(eq(reposTable.id, id), eq(reposTable.userId, req.userId!))).limit(1);
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(reposTable).set({ isBookmarked: !repo.isBookmarked }).where(eq(reposTable.id, id)).returning();
  res.json({ isBookmarked: updated.isBookmarked });
});

router.post("/repos/upload", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UploadZipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, base64Content } = parsed.data;

  const [repo] = await db.insert(reposTable).values({
    userId: req.userId!,
    name,
    status: "analyzing",
    sourceType: "zip",
  }).returning();

  analyzeZipRepo(repo.id, name, base64Content, req.userId!).catch((err) => {
    logger.error({ err, repoId: repo.id }, "ZIP analysis failed");
  });

  await db.insert(activityTable).values({
    userId: req.userId!,
    repoId: repo.id,
    type: "repo_analyzed",
    description: `Started analyzing ZIP: ${name}`,
  });

  res.status(201).json(formatRepo(repo));
});

router.get("/repos/:id/search/:query", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repoId = parseInt(req.params.id);
  const query = req.params.query.toLowerCase();

  const files = await db.select().from(filesTable).where(and(eq(filesTable.repoId, repoId), eq(filesTable.type, "file")));
  const results: Array<{ filePath: string; fileName: string; matchType: string; matchText: string; line: number | null }> = [];

  for (const file of files) {
    if (file.path.toLowerCase().includes(query)) {
      results.push({ filePath: file.path, fileName: file.name, matchType: "filename", matchText: file.name, line: null });
    }
    if (file.content && results.length < 50) {
      const lines = file.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(query)) {
          results.push({ filePath: file.path, fileName: file.name, matchType: "content", matchText: lines[i].trim().slice(0, 120), line: i + 1 });
          if (results.length >= 50) break;
        }
      }
    }
    if (results.length >= 50) break;
  }

  res.json(results);
});

// --- Background analysis functions ---

async function analyzeGithubRepo(repoId: number, owner: string, repo: string, userId: number) {
  try {
    const [meta, contributors, tree] = await Promise.all([
      fetchRepoMeta(owner, repo),
      fetchContributorCount(owner, repo),
      fetchRepoTree(owner, repo),
    ]);

    const textFiles = tree.filter((f) => f.type === "blob" && isTextFile(f.path)).slice(0, 150);
    const language = meta.language;

    await db.update(reposTable).set({
      description: meta.description,
      language,
      stars: meta.stargazers_count,
      forks: meta.forks_count,
      contributors,
      fileCount: textFiles.length,
      status: "analyzing",
    }).where(eq(reposTable.id, repoId));

    // Insert directory nodes first
    const dirs = new Set<string>();
    for (const file of textFiles) {
      const parts = file.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/"));
      }
    }
    for (const dir of dirs) {
      const parts = dir.split("/");
      const name = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
      await db.insert(filesTable).values({ repoId, path: dir, name, type: "directory", parentPath }).onConflictDoNothing();
    }

    // Fetch and store file contents in batches
    const batchSize = 10;
    for (let i = 0; i < textFiles.length; i += batchSize) {
      const batch = textFiles.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (file) => {
          const content = await fetchFileContent(owner, repo, file.path).catch(() => "");
          const parts = file.path.split("/");
          const name = parts[parts.length - 1];
          const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
          await db.insert(filesTable).values({
            repoId,
            path: file.path,
            name,
            type: "file",
            language: detectLanguage(file.path),
            content: content.slice(0, 50000),
            size: file.size ?? content.length,
            parentPath,
          });
        })
      );
    }

    await db.update(reposTable).set({ status: "ready", fileCount: textFiles.length }).where(eq(reposTable.id, repoId));

    await db.insert(activityTable).values({
      userId,
      repoId,
      type: "repo_analyzed",
      description: `Successfully analyzed ${owner}/${repo} — ${textFiles.length} files`,
    });
  } catch (err) {
    logger.error({ err, repoId }, "GitHub analysis error");
    await db.update(reposTable).set({ status: "error" }).where(eq(reposTable.id, repoId));
  }
}

async function analyzeZipRepo(repoId: number, name: string, base64Content: string, userId: number) {
  try {
    const files = extractZip(base64Content);

    // Insert directory nodes
    const dirs = new Set<string>();
    for (const file of files) {
      const parts = file.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/"));
      }
    }
    for (const dir of dirs) {
      const parts = dir.split("/");
      const dirName = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
      await db.insert(filesTable).values({ repoId, path: dir, name: dirName, type: "directory", parentPath }).onConflictDoNothing();
    }

    for (const file of files) {
      const parts = file.path.split("/");
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
      await db.insert(filesTable).values({
        repoId,
        path: file.path,
        name: file.name,
        type: "file",
        language: file.language,
        content: file.content.slice(0, 50000),
        size: file.size,
        parentPath,
      });
    }

    // Detect primary language
    const langs = files.map((f) => f.language).filter(Boolean);
    const langCounts: Record<string, number> = {};
    for (const l of langs) { if (l) langCounts[l] = (langCounts[l] || 0) + 1; }
    const language = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    await db.update(reposTable).set({ status: "ready", fileCount: files.length, language }).where(eq(reposTable.id, repoId));

    await db.insert(activityTable).values({
      userId,
      repoId,
      type: "repo_analyzed",
      description: `Successfully analyzed ZIP: ${name} — ${files.length} files`,
    });
  } catch (err) {
    logger.error({ err, repoId }, "ZIP analysis error");
    await db.update(reposTable).set({ status: "error" }).where(eq(reposTable.id, repoId));
  }
}

export default router;
