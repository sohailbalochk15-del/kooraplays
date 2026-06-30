import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { LangProvider } from "@/lib/i18n";

import Home from "@/pages/Home";
import Schedule from "@/pages/Schedule";
import Standings from "@/pages/Standings";
import Bracket from "@/pages/Bracket";
import VotePage from "@/pages/Vote";
import NotFound from "@/pages/not-found";

export const LIVE_URL = "https://www.finx24.com/p/watch-live.html";

const queryClient = new QueryClient();

function LiveRedirect() {
  useEffect(() => {
    window.location.href = LIVE_URL;
  }, []);
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground animate-pulse">Redirecting to live stream…</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/standings" component={Standings} />
      <Route path="/live" component={LiveRedirect} />
      <Route path="/bracket" component={Bracket} />
      <Route path="/vote" component={VotePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <div className="min-h-screen bg-background text-foreground flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col pb-16 md:pb-0">
                  <Router />
                </div>
              </div>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LangProvider>
    </ThemeProvider>
  );
}

export default App;
