import { logger } from "./logger";

const GITHUB_API = "https://api.github.com";

export interface GithubRepoMeta {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  contributors_url: string;
}

export interface GithubTreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
}

export function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

export async function fetchRepoMeta(owner: string, repo: string): Promise<GithubRepoMeta> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json() as Promise<GithubRepoMeta>;
}

export async function fetchContributorCount(owner: string, repo: string): Promise<number> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=1&anon=1`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) return 0;
    const link = res.headers.get("link") || "";
    const match = link.match(/page=(\d+)>; rel="last"/);
    if (match) return parseInt(match[1], 10);
    const data = (await res.json()) as unknown[];
    return data.length;
  } catch (err) {
    logger.warn({ err }, "Failed to get contributor count");
    return 0;
  }
}

export async function fetchRepoTree(owner: string, repo: string): Promise<GithubTreeItem[]> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`GitHub tree fetch error: ${res.status}`);
  const data = (await res.json()) as { tree: GithubTreeItem[]; truncated: boolean };
  return data.tree.filter((item) => item.type === "blob" && item.path);
}

export async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) return "";
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
  }
  return "";
}

const TEXT_EXTENSIONS = new Set([
  ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".c", ".cpp", ".h", ".cs",
  ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".md", ".txt", ".json",
  ".yaml", ".yml", ".toml", ".env", ".sh", ".bash", ".html", ".css", ".scss",
  ".sql", ".xml", ".graphql", ".vue", ".svelte", ".dart", ".r", ".scala",
]);

export function isTextFile(path: string): boolean {
  const ext = "." + path.split(".").pop()?.toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

export function detectLanguage(path: string): string | null {
  const ext = "." + path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ".js": "JavaScript", ".ts": "TypeScript", ".jsx": "JavaScript",
    ".tsx": "TypeScript", ".py": "Python", ".java": "Java",
    ".c": "C", ".cpp": "C++", ".cs": "C#", ".go": "Go",
    ".rs": "Rust", ".rb": "Ruby", ".php": "PHP",
    ".swift": "Swift", ".kt": "Kotlin", ".md": "Markdown",
    ".json": "JSON", ".yaml": "YAML", ".yml": "YAML",
    ".html": "HTML", ".css": "CSS", ".scss": "SCSS",
    ".sql": "SQL", ".sh": "Shell", ".bash": "Shell",
    ".vue": "Vue", ".svelte": "Svelte",
  };
  return map[ext] || null;
}
