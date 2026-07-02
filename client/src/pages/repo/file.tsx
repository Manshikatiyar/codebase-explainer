import { useState, useEffect } from "react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { useGetFile, useExplainFile, getGetFileQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Sparkles, FileCode2, Scale } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

declare global {
  interface Window {
    hljs: any;
  }
}

export default function RepoFile({ params }: { params: { id: string, fileId: string } }) {
  const repoId = parseInt(params.id);
  const fileId = parseInt(params.fileId);
  
  const { data: file, isLoading } = useGetFile(repoId, fileId);
  const explain = useExplainFile();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Highlight code when file changes
    if (file && window.hljs) {
      setTimeout(() => {
        document.querySelectorAll('pre code').forEach((block) => {
          window.hljs.highlightElement(block);
        });
      }, 0);
    }
  }, [file]);

  const handleExplain = () => {
    explain.mutate({ data: { fileId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFileQueryKey(repoId, fileId) });
      }
    });
  };

  if (isLoading) {
    return (
      <RepoLayout repoId={repoId}>
        <div className="flex h-full items-center justify-center">Loading file...</div>
      </RepoLayout>
    );
  }

  if (!file) {
    return (
      <RepoLayout repoId={repoId}>
        <div className="flex h-full items-center justify-center">File not found.</div>
      </RepoLayout>
    );
  }

  return (
    <RepoLayout repoId={repoId}>
      <div className="flex flex-col h-full bg-[#0d1117]"> {/* GitHub dark theme bg for seamless look */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0 bg-background">
          <div className="flex items-center gap-3 min-w-0">
            <FileCode2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono text-sm truncate">{file.path}</span>
          </div>
          <div className="flex items-center gap-3 text-xs shrink-0">
            {file.language && <Badge variant="outline" className="font-normal">{file.language}</Badge>}
            {file.size && <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>}
            <span className="text-muted-foreground">{file.content.split('\n').length} lines</span>
          </div>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
          <ResizablePanel defaultSize={60} minSize={30}>
            <ScrollArea className="h-full">
              <pre className="p-4 text-sm font-mono leading-relaxed bg-[#0d1117] text-[#c9d1d9] m-0 border-0 h-full">
                <code className={`language-${file.language?.toLowerCase() || 'plaintext'}`}>
                  {file.content}
                </code>
              </pre>
            </ScrollArea>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={40} minSize={25} className="bg-background border-l border-border/40 flex flex-col">
            <div className="p-3 border-b border-border/40 font-medium flex items-center gap-2 bg-muted/20 shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Explanation
            </div>
            <ScrollArea className="flex-1 p-4">
              {file.explanation ? (
                <div className="prose dark:prose-invert max-w-none text-sm">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: file.explanation.replace(/\n/g, '<br/>') }} />
                  </motion.div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4 space-y-4">
                  <Scale className="h-12 w-12 text-muted-foreground/30" />
                  <div>
                    <h3 className="font-medium">No explanation yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[250px] mx-auto">
                      Generate a detailed walkthrough of this file's purpose, functions, and logic.
                    </p>
                  </div>
                  <Button onClick={handleExplain} disabled={explain.isPending} className="mt-2">
                    {explain.isPending ? "Analyzing..." : "Explain this file"}
                  </Button>
                </div>
              )}
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </RepoLayout>
  );
}
