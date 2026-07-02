import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Terminal, Code, Cpu, Database, Layout, BookOpen, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-screen-2xl items-center px-4">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-bold hidden sm:inline-block">ExplainMyCode</span>
          </Link>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
            </div>
            <nav className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container mx-auto flex max-w-[64rem] flex-col items-center gap-4 text-center px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Understand any codebase <br className="hidden sm:inline" />
                <span className="text-muted-foreground">in seconds.</span>
              </h1>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8"
            >
              Paste a GitHub URL or upload a ZIP. Get instant architecture diagrams, file-by-file explanations, and a senior-level AI pair programmer ready to answer your questions.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex gap-4"
            >
              <Link href="/register">
                <Button size="lg" className="h-12 px-8">Try it for free</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 px-8">View Demo</Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto space-y-6 py-8 md:py-12 lg:py-24 max-w-6xl px-4">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl font-bold">Features</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Everything you need to onboard onto a new project rapidly.
            </p>
          </div>

          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <FeatureCard 
              icon={<Code className="h-10 w-10" />}
              title="GitHub & ZIP Support"
              description="Analyze public repositories directly from GitHub or upload local ZIP archives."
            />
            <FeatureCard 
              icon={<Cpu className="h-10 w-10" />}
              title="AI Explanations"
              description="Get plain-English explanations for complex algorithms, undocumented files, and spaghetti code."
            />
            <FeatureCard 
              icon={<Layout className="h-10 w-10" />}
              title="Architecture Diagrams"
              description="Instantly visualize data flows, folder structures, and system architecture."
            />
            <FeatureCard 
              icon={<BookOpen className="h-10 w-10" />}
              title="README Generation"
              description="Automatically generate comprehensive documentation for any undocumented project."
            />
            <FeatureCard 
              icon={<MessageSquare className="h-10 w-10" />}
              title="Interactive Chat"
              description="Chat with an AI that has full context of the entire repository."
            />
            <FeatureCard 
              icon={<Database className="h-10 w-10" />}
              title="Complexity Analysis"
              description="Identify large files, complex functions, and potential refactoring targets."
            />
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4">

        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border bg-background p-2">
      <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
        <div className="text-primary">{icon}</div>
        <div className="space-y-2">
          <h3 className="font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}