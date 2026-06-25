import { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveDot } from "./LiveDot";
import { CountdownTimer } from "./CountdownTimer";
import { PredictCard } from "./PredictCard";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

export interface MatchData {
  id: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  status: "LIVE" | "UPCOMING" | "FINISHED";
  date: string;
  venue: string;
  group?: string;
  home_flag?: string;
  away_flag?: string;
}

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

export function MatchCard({ match }: { match: MatchData }) {
  const { t, lang } = useLang();
  const isLive     = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";

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
        : "border-border"
    )}>
      <CardContent className="p-0">
        <div className="bg-muted/50 p-3 flex justify-between items-center text-xs text-muted-foreground border-b border-border/50">
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
            {match.status === "UPCOMING" && (
              <Badge variant="outline" className="bg-secondary text-secondary-foreground border-primary/20">
                {t.upcoming}
              </Badge>
            )}
            {isFinished && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                {t.ft}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-12 h-8 rounded-sm overflow-hidden bg-muted flex items-center justify-center border border-border">
              {match.home_flag ? (
                <img src={match.home_flag} alt={match.home_team} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{(match.home_team ?? "?").substring(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className="font-semibold text-center text-sm leading-tight">{match.home_team}</span>
          </div>

          <div className="flex flex-col items-center justify-center px-4">
            {isLive || isFinished ? (
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
                <img src={match.away_flag} alt={match.away_team} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{(match.away_team ?? "?").substring(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className="font-semibold text-center text-sm leading-tight">{match.away_team}</span>
          </div>
        </div>

        {isLive && (
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
