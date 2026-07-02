import { useGetDashboardStats, useGetRecentActivity, useListRepos, useToggleBookmark, getListReposQueryKey } from "@/lib/api-client";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FolderGit2, Activity, GitBranch, Star, Bookmark, MessageSquare, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: repos, isLoading: reposLoading } = useListRepos();
  const { data: activities, isLoading: activitiesLoading } = useGetRecentActivity();
  const toggleBookmark = useToggleBookmark();
  const queryClient = useQueryClient();

  const handleBookmark = (id: number) => {
    toggleBookmark.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReposQueryKey() });
      }
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your analyzed codebases.</p>
          </div>
          <Link href="/analyze">
            <Button data-testid="btn-analyze-new">Analyze New Repo</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analyzed Repos</CardTitle>
              <FolderGit2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.analyzedRepos || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Files Explained</CardTitle>
              <Terminal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalFiles || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalChats || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bookmarked</CardTitle>
              <Bookmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.bookmarkedRepos || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          <Card className="md:col-span-4 lg:col-span-5">
            <CardHeader>
              <CardTitle>Repositories</CardTitle>
              <CardDescription>Your recently analyzed codebases.</CardDescription>
            </CardHeader>
            <CardContent>
              {reposLoading ? (
                <div>Loading...</div>
              ) : repos && repos.length > 0 ? (
                <div className="space-y-4">
                  {repos.map((repo, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={repo.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      data-testid={`repo-item-${repo.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <FolderGit2 className="h-8 w-8 text-primary" />
                        <div>
                          <Link href={`/repo/${repo.id}`} className="font-semibold hover:underline">
                            {repo.name}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {repo.language && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {repo.language}</span>}
                            {repo.stars != null && <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {repo.stars}</span>}
                            {repo.forks != null && <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> {repo.forks}</span>}
                            <Badge variant={repo.status === 'ready' ? 'default' : repo.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px] px-1 py-0 h-4">
                              {repo.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleBookmark(repo.id)}
                          className={repo.isBookmarked ? "text-yellow-500" : "text-muted-foreground"}
                        >
                          <Bookmark className={`h-4 w-4 ${repo.isBookmarked ? "fill-current" : ""}`} />
                        </Button>
                        <Link href={`/repo/${repo.id}`}>
                          <Button variant="secondary" size="sm">View</Button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderGit2 className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <h3 className="mt-4 text-lg font-semibold">No repositories found</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">You haven't analyzed any codebases yet.</p>
                  <Link href="/analyze">
                    <Button>Analyze your first repo</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-3 lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Actions across your account.</CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div>Loading...</div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 text-sm">
                      <div className="mt-0.5"><Activity className="h-4 w-4 text-muted-foreground" /></div>
                      <div>
                        <p>{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(activity.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
