import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetRepo, getGetRepoQueryKey, useListRepoFiles, useToggleBookmark, useSearchInRepo } from "@/lib/api-client";
import { FolderGit2, Star, GitBranch, Bookmark, Search, File, Folder, ChevronRight, ChevronDown, Terminal, LogOut, ArrowLeft, MessageSquare, LayoutTemplate } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FileNode } from "@/lib/api-client/generated/api.schemas";

function FileTreeNode({ node, repoId, depth = 0 }: { node: FileNode, repoId: number, depth?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const isDir = node.type === 'directory';

  if (isDir) {
    return (
      <div className="w-full">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-1.5 px-2 py-1 text-sm hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Folder className="h-4 w-4 fill-muted" />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div className="flex flex-col">
            {node.children.map(child => (
              <FileTreeNode key={child.id} node={child} repoId={repoId} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={`/repo/${repoId}/file/${node.id}`}>
      <div 
        className="flex w-full items-center gap-1.5 px-2 py-1 text-sm hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 12 + 8 + 20}px` }}
      >
        <File className="h-4 w-4" />
        <span className="truncate">{node.name}</span>
      </div>
    </Link>
  );
}

export function RepoLayout({ children, repoId }: { children: ReactNode, repoId: number }) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: repo, isLoading: repoLoading } = useGetRepo(repoId, { query: { enabled: !!repoId, queryKey: getGetRepoQueryKey(repoId) } });
  const { data: files, isLoading: filesLoading } = useListRepoFiles(repoId);
  const { data: searchResults } = useSearchInRepo(repoId, { q: debouncedQuery }, { query: { enabled: debouncedQuery.length > 2 } });
  
  const toggleBookmark = useToggleBookmark();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleBookmark = () => {
    toggleBookmark.mutate({ id: repoId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRepoQueryKey(repoId) });
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setLocation("/");
  };

  if (repoLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading repository...</div>;
  }

  if (!repo) {
    return <div className="min-h-screen flex items-center justify-center">Repository not found</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border/40 bg-sidebar flex flex-col hidden md:flex shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-border/40 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
        
        <div className="p-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search files..." 
              className="pl-9 h-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col py-2">
            <div className="px-4 pb-2 mb-2 border-b border-border/40 flex flex-col gap-1">
              <Link href={`/repo/${repoId}`}>
                <Button variant="ghost" className="w-full justify-start h-8 px-2">
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Overview
                </Button>
              </Link>
              <Link href={`/repo/${repoId}/chat`}>
                <Button variant="ghost" className="w-full justify-start h-8 px-2">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  AI Chat
                </Button>
              </Link>
            </div>

            {searchQuery.length > 2 ? (
              <div className="px-2">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Search Results</div>
                {searchResults && searchResults.length > 0 ? (
                  searchResults.map((result, i) => (
                    <Link key={i} href={`/repo/${repoId}/file/${result.filePath}`}>
                      <div className="flex flex-col px-2 py-2 hover:bg-accent/50 rounded-md cursor-pointer mb-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <File className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{result.fileName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate pl-5">
                          {result.matchText}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-2 py-4 text-sm text-center text-muted-foreground">No matches found</div>
                )}
              </div>
            ) : (
              <div className="px-2">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Files</div>
                {filesLoading ? (
                  <div className="px-2 py-2 text-sm text-muted-foreground">Loading tree...</div>
                ) : files ? (
                  files.map(node => (
                    <FileTreeNode key={node.id} node={node} repoId={repoId} />
                  ))
                ) : null}
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border/40 shrink-0 bg-background">
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="font-semibold text-lg truncate flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-primary" />
              {repo.name}
            </h1>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {repo.language && <Badge variant="secondary" className="h-5 text-xs px-1.5">{repo.language}</Badge>}
              <Badge variant={repo.status === 'ready' ? 'default' : 'secondary'} className="h-5 text-xs px-1.5">{repo.status}</Badge>
              {repo.stars != null && <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2"><Star className="h-3.5 w-3.5" />{repo.stars}</div>}
              {repo.forks != null && <div className="flex items-center gap-1 text-xs text-muted-foreground"><GitBranch className="h-3.5 w-3.5" />{repo.forks}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBookmark}
              className={repo.isBookmarked ? "text-yellow-500" : "text-muted-foreground"}
            >
              <Bookmark className={`h-4 w-4 ${repo.isBookmarked ? "fill-current" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-background/50">
          {children}
        </div>
      </main>
    </div>
  );
}
