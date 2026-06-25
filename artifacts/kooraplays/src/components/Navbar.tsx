import { Link, useLocation } from "wouter";
import { Tv, Trophy, Calendar, Table2, GitMerge, Globe, Vote } from "lucide-react";
import { LiveDot } from "./LiveDot";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

export function Navbar() {
  const [location] = useLocation();
  const { t, lang, setLang } = useLang();

  const NAV_LINKS = [
    { href: "/",          label: t.home,      icon: Trophy       },
    { href: "/schedule",  label: t.schedule,  icon: Calendar     },
    { href: "/standings", label: t.standings, icon: Table2       },
    { href: "/bracket",   label: t.bracket,   icon: GitMerge     },
    { href: "/vote",      label: t.vote,       icon: Vote         },
  ];

  const toggleLang = () => setLang(lang === "en" ? "ar" : "en");

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 md:h-16 items-center justify-between mx-auto px-4">
          <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="bg-primary text-primary-foreground p-1 rounded-md">
              <Trophy className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <span className="font-bold text-lg md:text-xl tracking-tight">KooraPlays</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse text-sm font-medium">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-foreground/80 px-3 py-2 rounded-md flex items-center gap-2",
                  location === link.href
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/60"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="hidden md:flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-bold text-foreground/70 hover:text-foreground hover:border-border transition-colors"
              title={lang === "en" ? "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" : "English"}
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === "en" ? "\u0639\u0631\u0628\u064a" : "EN"}
            </button>

            <Link href="/live" className="hidden md:block">
              <Button
                variant={location === "/live" ? "default" : "outline"}
                className={cn(
                  "gap-2 font-bold",
                  location === "/live"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "border-destructive text-destructive hover:bg-destructive/10"
                )}
              >
                <LiveDot />
                {t.liveTV}
              </Button>
            </Link>

            <button
              onClick={toggleLang}
              className="flex md:hidden items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-bold text-foreground/70 hover:text-foreground transition-colors"
            >
              <Globe className="h-3 w-3" />
              {lang === "en" ? "\u0639" : "EN"}
            </button>

            <Link href="/live" className="flex md:hidden">
              <Button
                size="sm"
                variant={location === "/live" ? "default" : "outline"}
                className={cn(
                  "gap-1.5 font-bold text-xs h-8 px-3",
                  location === "/live"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "border-destructive text-destructive hover:bg-destructive/10"
                )}
              >
                <LiveDot className="h-1.5 w-1.5" />
                {t.live}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-bottom">
        <div className="flex items-stretch h-16">
          {NAV_LINKS.map((link) => {
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <link.icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <Link
            href="/live"
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors",
              location === "/live" ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <div className={cn(
              "relative flex items-center justify-center rounded-full w-8 h-8",
              location === "/live" ? "bg-destructive/15" : ""
            )}>
              <Tv className="h-5 w-5" />
              <LiveDot className="absolute -top-0.5 -right-0.5 h-2 w-2" />
            </div>
            <span>{t.liveTV}</span>
          </Link>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
}
