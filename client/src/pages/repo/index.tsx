import { RepoLayout } from "@/components/layout/repo-layout";
import { useGetRepo, useGetArchitecture, useGetReadme, useGetComplexity, useGetInterviewQuestions } from "@/lib/api-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RepoOverview({ params }: { params: { id: string } }) {
  const repoId = parseInt(params.id);
  const { data: repo } = useGetRepo(repoId);
  
  return (
    <RepoLayout repoId={repoId}>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Repository Overview</h2>
          {repo?.description && <p className="text-muted-foreground">{repo.description}</p>}
        </div>

        <Tabs defaultValue="architecture" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="readme">README</TabsTrigger>
            <TabsTrigger value="complexity">Complexity</TabsTrigger>
            <TabsTrigger value="interview">Interview Q&A</TabsTrigger>
          </TabsList>
          
          <TabsContent value="architecture">
            <ArchitectureTab repoId={repoId} />
          </TabsContent>
          <TabsContent value="readme">
            <ReadmeTab repoId={repoId} />
          </TabsContent>
          <TabsContent value="complexity">
            <ComplexityTab repoId={repoId} />
          </TabsContent>
          <TabsContent value="interview">
            <InterviewTab repoId={repoId} />
          </TabsContent>
        </Tabs>
      </div>
    </RepoLayout>
  );
}

function ArchitectureTab({ repoId }: { repoId: number }) {
  const { data: arch, isLoading } = useGetArchitecture(repoId);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Analyzing architecture...</div>;
  if (!arch) return <div className="py-8 text-center text-muted-foreground">Architecture data unavailable.</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>{arch.overview}</p>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Folder Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm font-mono border border-border/50">
              {arch.folderStructure}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {arch.techStack?.map((tech, i) => (
              <Badge key={i} variant="secondary">{tech}</Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Flow</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>{arch.dataFlow}</p>
        </CardContent>
      </Card>

      {arch.authFlow && (
        <Card>
          <CardHeader>
            <CardTitle>Authentication Flow</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p>{arch.authFlow}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReadmeTab({ repoId }: { repoId: number }) {
  const { data: readme, isLoading } = useGetReadme(repoId);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Generating README...</div>;
  if (!readme) return <div className="py-8 text-center text-muted-foreground">README not available.</div>;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="prose dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-sans bg-transparent border-0 p-0 text-foreground">{readme.content}</pre>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplexityTab({ repoId }: { repoId: number }) {
  const { data: complexity, isLoading } = useGetComplexity(repoId);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Analyzing complexity...</div>;
  if (!complexity) return <div className="py-8 text-center text-muted-foreground">Complexity data unavailable.</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Overall Complexity Score</CardTitle>
          <CardDescription>Lower is better (easier to maintain)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-primary">{complexity.score}</div>
            <div className="text-sm text-muted-foreground max-w-md">{complexity.summary}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Complex Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {complexity.largeFiles.map((file, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                  <div className="truncate pr-4 font-mono text-sm" title={file.path}>{file.path}</div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="outline">{file.lines} lines</Badge>
                    <Badge variant="destructive">{file.complexity}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimization Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              {complexity.optimizations.map((opt, i) => (
                <li key={i}>{opt}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InterviewTab({ repoId }: { repoId: number }) {
  const { data: qna, isLoading } = useGetInterviewQuestions(repoId);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Generating questions...</div>;
  if (!qna || qna.questions.length === 0) return <div className="py-8 text-center text-muted-foreground">No interview questions available.</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Prep</CardTitle>
        <CardDescription>Questions a senior engineer might ask you about this codebase.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {qna.questions.map((q, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <Badge variant={q.difficulty === 'hard' ? 'destructive' : q.difficulty === 'medium' ? 'default' : 'secondary'}>
                    {q.difficulty}
                  </Badge>
                  <span>{q.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground bg-muted/30 p-4 rounded-md mt-2">
                <span className="font-semibold text-foreground">Hint:</span> {q.hint || "No hint provided."}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
