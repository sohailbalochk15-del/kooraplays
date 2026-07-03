import { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveDot } from "./LiveDot";
import { CountdownTimer } from "./CountdownTimer";
import { PredictCard } from "./PredictCard";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { Tv } from "lucide-react";
import type { MatchData } from "@/api/worldcup";
import { Link } from "wouter";



export type { MatchData };

function ScoreDigit({ value }: { value: number }) {
  const prevRef  = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
    return undefined;
  }, [value]);

  return (
    <span className={cn(
      "transition-all duration-300",
      flash && "text-yellow-400 scale-125 inline-block"
    )}>
      {value}
    </span>
  );
}

export function MatchCard({ match, liveIndex }: { match: MatchData; liveIndex?: 1 | 2 }) {
  const { t, lang } = useLang();
  const isLive     = match.status === "LIVE";
  const isHalfTime = match.status === "HALFTIME";
  const isFinished = match.status === "FINISHED";
  const isWatchable = isLive || isHalfTime;

  let matchTime = "";
  try {
    matchTime = format(parseISO(match.date), "MMM d, h:mm a");
  } catch {
    matchTime = match.date;
  }

  const groupLabel = match.group
    ? match.group.replace("Group ", `${t.group} `)
    : undefined;

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      isLive
        ? "border-destructive shadow-[0_0_15px_rgba(226,75,74,0.3)] hover:shadow-[0_0_25px_rgba(226,75,74,0.5)] hover:scale-[1.02]"
        : isHalfTime
        ? "border-yellow-500/60 shadow-[0_0_12px_rgba(234,179,8,0.2)] hover:shadow-[0_0_22px_rgba(234,179,8,0.35)] hover:scale-[1.02]"
        : "border-border"
    )}>
      <CardContent className="p-0">
        <Link
          href={`/match/${match.id}`}
          className="bg-muted/50 p-3 flex justify-between items-center text-xs text-muted-foreground border-b border-border/50 hover:bg-muted/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            {groupLabel && <span className="font-semibold text-foreground/80">{groupLabel}</span>}
            <span>&bull;</span>
            <span className="truncate max-w-[120px]">{match.venue}</span>
          </div>
          <div>
            {isLive && (
              <Badge variant="destructive" className="animate-pulse flex gap-1.5 items-center px-2 py-0.5">
                <LiveDot className="h-2 w-2" />
                <span>{t.live}</span>
              </Badge>
            )}
            {isHalfTime && (
              <Badge className="flex gap-1.5 items-center px-2 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/40 hover:bg-yellow-500/20">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
                HT
              </Badge>
            )}
            {match.status === "UPCOMING" && (
              <Badge variant="outline" className="bg-secondary text-secondary-foreground border-primary/20">
                {t.upcoming}
              </Badge>
            )}
            {isFinished && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                FINISHED
              </Badge>
            )}
          </div>
        </Link>

        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-12 h-8 rounded-sm overflow-hidden bg-muted flex items-center justify-center border border-border">
              {match.home_flag ? (
                <img src={match.home_flag} alt={match.home_team} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{(match.home_team ?? "?").substring(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className="font-semibold text-center text-sm leading-tight">{match.home_team}</span>
          </div>

          <div className="flex flex-col items-center justify-center px-4">
            {isLive || isFinished || isHalfTime ? (
              <div className="text-3xl font-black tracking-tighter flex items-center gap-3">
                <span className={cn(
                  "transition-colors duration-300",
                  (match.home_score ?? 0) > (match.away_score ?? 0) ? "text-primary" : ""
                )}>
                  <ScoreDigit value={match.home_score ?? 0} />
                </span>
                <span className="text-muted-foreground text-xl font-normal">-</span>
                <span className={cn(
                  "transition-colors duration-300",
                  (match.away_score ?? 0) > (match.home_score ?? 0) ? "text-primary" : ""
                )}>
                  <ScoreDigit value={match.away_score ?? 0} />
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium whitespace-nowrap" dir="ltr">{matchTime}</span>
                <CountdownTimer targetDate={match.date} lang={lang} />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-12 h-8 rounded-sm overflow-hidden bg-muted flex items-center justify-center border border-border">
              {match.away_flag ? (
                <img src={match.away_flag} alt={match.away_team} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{(match.away_team ?? "?").substring(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className="font-semibold text-center text-sm leading-tight">{match.away_team}</span>
          </div>
        </div>

        {isWatchable && (
          <div className="px-4 pb-3">
            <Link
              href="/live"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg active:scale-95 transition-all py-2.5 text-white text-sm font-bold shadow-md touch-manipulation",
                isLive
                  ? "bg-destructive hover:bg-destructive/90 shadow-destructive/30"
                  : "bg-yellow-500 hover:bg-yellow-400 shadow-yellow-500/30"
              )}
            >
              <Tv className="h-4 w-4" />
              {isLive
                ? <><LiveDot className="h-2 w-2" /> {t.live} — {t.watchNow}</>
                : <>{t.halfTime} — {t.watchNow}</>
              }
            </Link>
          </div>
        )}
        {isWatchable && (
          <PredictCard
            matchId={match.id}
            homeTeam={match.home_team}
            awayTeam={match.away_team}
          />
        )}
      </CardContent>
    </Card>
  );
}
