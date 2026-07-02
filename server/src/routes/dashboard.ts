import { Router } from "express";
import { db } from "../db";
import { reposTable, chatsTable, activityTable } from "../db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const repos = await db.select().from(reposTable).where(eq(reposTable.userId, userId));
  const totalRepos = repos.length;
  const analyzedRepos = repos.filter((r) => r.status === "ready").length;
  const bookmarkedRepos = repos.filter((r) => r.isBookmarked).length;
  const totalFiles = repos.reduce((sum, r) => sum + (r.fileCount || 0), 0);
  const recentLanguages = [...new Set(repos.map((r) => r.language).filter(Boolean))].slice(0, 5) as string[];

  const chatRows = await db
    .select({ count: count() })
    .from(chatsTable)
    .where(eq(chatsTable.userId, userId));
  const totalChats = Number(chatRows[0]?.count ?? 0);

  res.json({ totalRepos, analyzedRepos, totalChats, bookmarkedRepos, totalFiles, recentLanguages });
});

router.get("/dashboard/recent", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const items = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.userId, userId))
    .orderBy(desc(activityTable.createdAt))
    .limit(20);

  const repoIds = [...new Set(items.map((i) => i.repoId).filter(Boolean))] as number[];
  const repoRows = repoIds.length
    ? await db.select({ id: reposTable.id, name: reposTable.name }).from(reposTable)
    : [];
  const repoMap = Object.fromEntries(repoRows.map((r) => [r.id, r.name]));

  res.json(
    items.map((i) => ({
      id: i.id,
      type: i.type,
      description: i.description,
      repoId: i.repoId ?? null,
      repoName: i.repoId ? (repoMap[i.repoId] ?? null) : null,
      createdAt: i.createdAt.toISOString(),
    }))
  );
});

export default router;
