import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reposTable = pgTable("repos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  url: text("url"),
  description: text("description"),
  language: text("language"),
  stars: integer("stars"),
  forks: integer("forks"),
  contributors: integer("contributors"),
  status: text("status").notNull().default("pending"),
  isBookmarked: boolean("is_bookmarked").notNull().default(false),
  sourceType: text("source_type").notNull().default("github"),
  fileCount: integer("file_count"),
  architectureCache: text("architecture_cache"),
  readmeCache: text("readme_cache"),
  complexityCache: text("complexity_cache"),
  interviewCache: text("interview_cache"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRepoSchema = createInsertSchema(reposTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRepo = z.infer<typeof insertRepoSchema>;
export type Repo = typeof reposTable.$inferSelect;
