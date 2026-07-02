import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAnalyzeRepo, useUploadZip, useGetRepo, getGetRepoQueryKey } from "@/lib/api-client";
import { useLocation } from "wouter";
import { Github, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const githubSchema = z.object({
  url: z.string().url().includes("github.com", { message: "Must be a valid GitHub URL" }),
});

export default function Analyze() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const analyzeRepo = useAnalyzeRepo();
  const uploadZip = useUploadZip();
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();

  const { data: repoStatus } = useGetRepo(analyzingId!, {
    query: {
      enabled: !!analyzingId,
      refetchInterval: (query) => {
        // Stop polling if status is ready or error
        if (query.state.data?.status === 'ready' || query.state.data?.status === 'error') {
          return false;
        }
        return 2000;
      }
    }
  });

  useEffect(() => {
    if (repoStatus?.status === 'ready') {
      toast({ title: "Analysis Complete!", description: "Redirecting to repo viewer..." });
      setLocation(`/repo/${repoStatus.id}`);
    } else if (repoStatus?.status === 'error') {
      toast({ variant: "destructive", title: "Analysis Failed", description: "There was an error analyzing this repository." });
      setAnalyzingId(null);
    }
  }, [repoStatus, setLocation, toast]);

  const githubForm = useForm<z.infer<typeof githubSchema>>({
    resolver: zodResolver(githubSchema),
    defaultValues: { url: "" },
  });

  function onGithubSubmit(values: z.infer<typeof githubSchema>) {
    analyzeRepo.mutate({ data: { url: values.url } }, {
      onSuccess: (data) => {
        setAnalyzingId(data.id);
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message || "Failed to start analysis." });
      }
    });
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please upload a .zip file." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      // Extract just the base64 part
      const base64Content = base64.split(',')[1];
      
      uploadZip.mutate({ data: { name: file.name, base64Content } }, {
        onSuccess: (data) => {
          setAnalyzingId(data.id);
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Upload Error", description: err.message || "Failed to upload zip." });
        }
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Analyze New Codebase</h1>
          <p className="text-muted-foreground mt-2">Connect a GitHub repository or upload a local ZIP file to get started.</p>
        </div>

        {analyzingId ? (
          <Card className="border-primary/50 shadow-lg shadow-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                Analyzing Repository
              </CardTitle>
              <CardDescription>This may take a few minutes depending on the codebase size.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="flex justify-between text-sm font-medium">
                <span className={repoStatus?.status ? "text-primary" : "text-muted-foreground"}>Fetching</span>
                <span className={repoStatus?.status === 'analyzing' || repoStatus?.status === 'ready' ? "text-primary" : "text-muted-foreground"}>Parsing</span>
                <span className={repoStatus?.status === 'analyzing' || repoStatus?.status === 'ready' ? "text-primary" : "text-muted-foreground"}>AI Analysis</span>
                <span className={repoStatus?.status === 'ready' ? "text-primary" : "text-muted-foreground"}>Done</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ 
                    width: repoStatus?.status === 'ready' ? '100%' : 
                           repoStatus?.status === 'analyzing' ? '66%' : 
                           repoStatus?.status === 'pending' ? '33%' : '5%' 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="github" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="github"><Github className="w-4 h-4 mr-2" /> GitHub URL</TabsTrigger>
                  <TabsTrigger value="zip"><Upload className="w-4 h-4 mr-2" /> Upload ZIP</TabsTrigger>
                </TabsList>
                
                <TabsContent value="github" className="space-y-4">
                  <Form {...githubForm}>
                    <form onSubmit={githubForm.handleSubmit(onGithubSubmit)} className="space-y-4">
                      <FormField
                        control={githubForm.control}
                        name="url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repository URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://github.com/facebook/react" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={analyzeRepo.isPending}>
                        {analyzeRepo.isPending ? "Starting Analysis..." : "Analyze Repository"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="zip" className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:bg-accent/50 transition-colors">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-1">Click or drag ZIP file</h3>
                    <p className="text-sm text-muted-foreground mb-4">Max size 50MB. Includes source files only.</p>
                    <Input 
                      type="file" 
                      accept=".zip" 
                      className="hidden" 
                      id="zip-upload" 
                      onChange={handleFileUpload}
                      disabled={uploadZip.isPending}
                    />
                    <label htmlFor="zip-upload">
                      <Button variant="outline" className="cursor-pointer" asChild disabled={uploadZip.isPending}>
                        <span>{uploadZip.isPending ? "Uploading..." : "Select File"}</span>
                      </Button>
                    </label>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
