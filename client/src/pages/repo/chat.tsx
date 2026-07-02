import { useState, useRef, useEffect } from "react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { useGetChatHistory, useSendChatMessage, getGetChatHistoryQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const SUGGESTED_PROMPTS = [
  "Explain the authentication flow",
  "Where is the database connection?",
  "How does the payment logic work?",
  "Find bugs in the auth code"
];

export default function RepoChat({ params }: { params: { id: string } }) {
  const repoId = parseInt(params.id);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: history, isLoading } = useGetChatHistory(repoId);
  const sendMessage = useSendChatMessage();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, sendMessage.isPending]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    // Optimistic update could go here, but for now we'll just wait for the mutation
    sendMessage.mutate({ data: { message: text, repoId } }, {
      onSuccess: () => {
        setInput("");
        queryClient.invalidateQueries({ queryKey: getGetChatHistoryQueryKey(repoId) });
      }
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <RepoLayout repoId={repoId}>
      <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-6">
        <Card className="flex-1 flex flex-col overflow-hidden border-border/50 bg-card/50 shadow-sm">
          <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Codebase Assistant</h2>
          </div>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-6 pb-4">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading chat history...</div>
              ) : history?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-lg">I'm ready to help</p>
                    <p className="text-muted-foreground max-w-sm">Ask me anything about this repository. I have full context of all files, architecture, and logic.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-4">
                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                      <Button 
                        key={i} 
                        variant="outline" 
                        className="h-auto py-3 px-4 justify-start text-left whitespace-normal text-sm font-normal"
                        onClick={() => handleSend(prompt)}
                        disabled={sendMessage.isPending}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                history?.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id || i} 
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-lg p-4 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted border border-border/50 text-foreground'
                    }`}>
                      <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))
              )}
              {sendMessage.isPending && (
                <div className="flex gap-4 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="max-w-[85%] rounded-lg p-4 bg-muted border border-border/50 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t border-border/50 bg-background mt-auto">
            <div className="relative flex items-end gap-2">
              <Textarea
                placeholder="Ask about the code..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                className="min-h-[60px] max-h-[200px] resize-none pb-10"
                disabled={sendMessage.isPending}
              />
              <Button 
                size="icon" 
                className="absolute right-3 bottom-3 h-8 w-8" 
                disabled={!input.trim() || sendMessage.isPending}
                onClick={() => handleSend(input)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center mt-2">
              AI can make mistakes. Verify important information.
            </div>
          </div>
        </Card>
      </div>
    </RepoLayout>
  );
}
