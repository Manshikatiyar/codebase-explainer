import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@/lib/api-client";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import Analyze from "@/pages/analyze";
import RepoOverview from "@/pages/repo/index";
import RepoChat from "@/pages/repo/chat";
import RepoFile from "@/pages/repo/file";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { data: user, isLoading, isError } = useGetMe({ query: { retry: false }});

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
  
  if (isError || !user) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/analyze">
        {() => <ProtectedRoute component={Analyze} />}
      </Route>
      <Route path="/repo/:id">
        {(params) => <ProtectedRoute component={RepoOverview} params={params} />}
      </Route>
      <Route path="/repo/:id/chat">
        {(params) => <ProtectedRoute component={RepoChat} params={params} />}
      </Route>
      <Route path="/repo/:id/file/:fileId">
        {(params) => <ProtectedRoute component={RepoFile} params={params} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
