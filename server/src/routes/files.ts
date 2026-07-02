import { Router } from "express";
import { db } from "../db";
import { filesTable, reposTable } from "../db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/repos/:id/files", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const repoId = parseInt(req.params.id);
  const files = await db.select().from(filesTable).where(eq(filesTable.repoId, repoId));

  // Build nested tree
  type TreeNode = {
    id: number; path: string; name: string; type: string;
    language: string | null; size: number | null; children: TreeNode[];
  };

  const nodeMap = new Map<string, TreeNode>();
  for (const f of files) {
    nodeMap.set(f.path, {
      id: f.id, path: f.path, name: f.name, type: f.type,
      language: f.language ?? null, size: f.size ?? null, children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const f of files) {
    const node = nodeMap.get(f.path)!;
    if (f.parentPath && nodeMap.has(f.parentPath)) {
      nodeMap.get(f.parentPath)!.children.push(node);
    } else if (!f.parentPath) {
      roots.push(node);
    } else {
      roots.push(node);
    }
  }

  res.json(roots);
});

router.get("/repos/:id/files/:fileId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const fileId = parseInt(req.params.fileId);
  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, fileId)).limit(1);
  if (!file) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: file.id,
    path: file.path,
    name: file.name,
    language: file.language ?? null,
    content: file.content ?? "",
    size: file.size ?? null,
    explanation: file.explanation ?? null,
  });
});

export default router;
