import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Terminal, LogOut, LayoutDashboard, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MainLayout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setLocation("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Terminal className="h-5 w-5 text-primary" />
              <span className="font-bold hidden sm:inline-block">ExplainMyCode</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/dashboard" className="transition-colors hover:text-foreground/80">Dashboard</Link>
              <Link href="/analyze" className="transition-colors hover:text-foreground/80">Analyze Repo</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out" data-testid="btn-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
