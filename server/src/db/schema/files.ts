import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const filesTable = pgTable("files", {
  id: serial("id").primaryKey(),
  repoId: integer("repo_id").notNull(),
  path: text("path").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("file"),
  language: text("language"),
  content: text("content"),
  size: integer("size"),
  explanation: text("explanation"),
  parentPath: text("parent_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFileSchema = createInsertSchema(filesTable).omit({ id: true, createdAt: true });
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof filesTable.$inferSelect;
