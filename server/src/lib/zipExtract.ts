import AdmZip from "adm-zip";
import { isTextFile, detectLanguage } from "./github";

export interface ExtractedFile {
  path: string;
  name: string;
  content: string;
  language: string | null;
  size: number;
}

const MAX_FILE_SIZE = 100 * 1024; // 100KB per file
const MAX_FILES = 200;

export function extractZip(base64Content: string): ExtractedFile[] {
  const buffer = Buffer.from(base64Content, "base64");
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const results: ExtractedFile[] = [];

  for (const entry of entries) {
    if (results.length >= MAX_FILES) break;
    if (entry.isDirectory) continue;

    const entryPath = entry.entryName;
    const parts = entryPath.split("/");
    const name = parts[parts.length - 1];

    if (!name || name.startsWith(".") || !isTextFile(entryPath)) continue;
    if (entry.header.size > MAX_FILE_SIZE) continue;

    try {
      const content = entry.getData().toString("utf-8");
      results.push({
        path: entryPath,
        name,
        content,
        language: detectLanguage(entryPath),
        size: entry.header.size,
      });
    } catch {
      // skip binary files that fail utf-8 decode
    }
  }

  return results;
}
