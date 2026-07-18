import { useMatches } from "@/hooks/useMatches";
import { MatchCard } from "@/components/MatchCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight, PlayCircle, Calendar } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { isToday, parseISO, isFuture, format } from "date-fns";
import { useLang } from "@/lib/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Home() {
  const { data: matches, isLoading, isError, refetch } = useMatches();
  const { t, lang } = useLang();
  useDocumentTitle(
    "KooraPlays — FIFA World Cup 2026 Live Scores & Streams",
    "Watch FIFA World Cup 2026 live streams, real-time scores, standings, and match schedules on KooraPlays."
  );

  const todayMatches = (matches ?? []).filter((m) => {
    try { return isToday(parseISO(m.date)); } catch { return false; }
  });

  const upcomingMatches = (matches ?? [])
    .filter((m) => {
      try {
        const d = parseISO(m.date);
        return m.status === "UPCOMING" && isFuture(d) && !isToday(d);
      } catch { return false; }
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    .slice(0, 9);

  const upcomingByDate = upcomingMatches.reduce<Record<string, typeof upcomingMatches>>((acc, m) => {
    const day = format(parseISO(m.date), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(m);
    return acc;
  }, {});

  const liveMatches  = todayMatches.filter((m) => m.status === "LIVE");
  const otherMatches = todayMatches.filter((m) => m.status !== "LIVE").slice(0, 5);
  const displayMatches = [...liveMatches, ...otherMatches];

  // Map live matches to channel index (1 or 2) for MatchCard badges
  const liveIndexMap = new Map<string | number, 1 | 2>();
  let liveCounter = 0;
  displayMatches.forEach((m) => {
    if ((m.status === "LIVE" || m.status === "HALFTIME") && liveCounter < 2) {
      liveCounter++;
      liveIndexMap.set(m.id, liveCounter as 1 | 2);
    }
  });

  const formatDayLabel = (dateKey: string) => {
    const d = parseISO(dateKey);
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-US", {
      weekday: "long", month: "long", day: "numeric",
    }).format(d);
  };

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Hero section ── */}
      <section className="relative overflow-hidden bg-card border-b border-border/40 py-12 md:py-20 px-4 md:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
        <div className="container mx-auto relative z-10 flex flex-col items-start gap-4 md:gap-6 max-w-5xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs md:text-sm border border-primary/30 text-primary bg-primary/5 font-semibold">
            <Trophy className="h-3 w-3 md:h-4 md:w-4" />
            {t.officialBroadcaster}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
            {t.heroTitle} <span className="text-primary">{t.heroTitleYear}</span> {t.heroTitleSuffix}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl">
            {t.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2 md:mt-4 w-full sm:w-auto">
            <Link href="https://www.finx24.com/2026/07/emirates-first-class-a380-reviews-or.html" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground
                           text-base md:text-lg px-6 md:px-8 h-12 md:h-14 rounded-full font-bold"
              >
                <PlayCircle className="me-2 h-5 w-5" />
                {t.startWatching}
              </Button>
            </Link>
            <Link href="/schedule" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 rounded-full font-semibold"
              >
                {t.fullSchedule}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 flex-1 space-y-14">

        {/* ── Today's Matches ── */}
        <section>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-xl md:text-3xl font-bold tracking-tight">{t.todaysMatches}</h2>
            <Link href="/schedule">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm gap-1" data-testid="link-view-all">
                {t.viewAll} <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </Link>
          </div>

          {isError && (
            <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-xl mb-8">
              <p className="text-destructive font-semibold mb-4">{t.failedMatchData}</p>
              <Button onClick={() => refetch()} variant="outline" data-testid="button-retry">
                {t.retry}
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : displayMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayMatches.map((match, i) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  data-testid={`card-match-${match.id}`}
                >
                  <MatchCard match={match} liveIndex={liveIndexMap.get(match.id)} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground bg-card rounded-xl border border-border">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-1">{t.noMatchesToday}</p>
              <p className="text-sm">{t.noMatchesTodayDesc}</p>
              <Link href="/schedule">
                <Button variant="outline" className="mt-4" data-testid="link-schedule">
                  {t.viewSchedule}
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* ── Upcoming Matches ── */}
        <section>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                {t.upcomingMatches}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{t.upcomingMatchesDesc}</p>
            </div>
            <Link href="/schedule">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm gap-1">
                {t.viewMoreUpcoming} <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-8">
              {Array.from({ length: 2 }).map((_, g) => (
                <div key={g}>
                  <div className="h-5 w-40 bg-muted rounded mb-4 animate-pulse" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(upcomingByDate).length > 0 ? (
            <div className="space-y-10">
              {Object.entries(upcomingByDate).map(([dayKey, dayMatches], gi) => (
                <motion.div
                  key={dayKey}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-border/60" />
                    <span className="text-xs md:text-sm font-semibold text-muted-foreground px-3 py-1 rounded-full bg-card border border-border/60 whitespace-nowrap">
                      {formatDayLabel(dayKey)}
                    </span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dayMatches.map((match, i) => (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: gi * 0.1 + i * 0.06 }}
                        data-testid={`card-upcoming-${match.id}`}
                      >
                        <MatchCard match={match} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-base font-semibold mb-1">{t.noUpcoming}</p>
                <p className="text-sm">{t.noUpcomingDesc}</p>
              </div>
            )
          )}
        </section>

      </main>
    </div>
  );
}
