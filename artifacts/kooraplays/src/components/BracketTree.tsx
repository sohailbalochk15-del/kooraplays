import { useLang } from "@/lib/i18n";
import { useMatches } from "@/hooks/useMatches";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { LiveDot } from "./LiveDot";
import { KNOCKOUT_ROUND_ORDER, type KnockoutRound, type MatchData } from "@/api/worldcup";

const ROUND_LABEL_KEY: Record<KnockoutRound, "roundOf32" | "roundOf16" | "quarterFinals" | "semiFinals" | "thirdPlace" | "finalRound"> = {
  r32: "roundOf32",
  r16: "roundOf16",
  qf: "quarterFinals",
  sf: "semiFinals",
  third: "thirdPlace",
  final: "finalRound",
};

function TeamRow({
  name,
  flag,
  score,
  isTbd,
  isWinner,
}: {
  name: string;
  flag?: string;
  score?: number;
  isTbd?: boolean;
  isWinner?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 px-3 py-2", isWinner && "bg-primary/10")}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-4 rounded-sm overflow-hidden bg-muted flex items-center justify-center border border-border shrink-0">
          {flag ? (
            <img src={flag} alt={name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : null}
        </div>
        <span
          className={cn(
            "text-sm truncate",
            isTbd ? "text-muted-foreground italic" : "font-medium text-foreground",
            isWinner && "font-bold"
          )}
        >
          {name}
        </span>
      </div>
      {score !== undefined && (
        <span className={cn("text-sm font-bold tabular-nums", isWinner && "text-primary")}>{score}</span>
      )}
    </div>
  );
}

function BracketMatchCard({ match }: { match: MatchData }) {
  const isTbd = match.is_home_tbd || match.is_away_tbd;
  const isLive = match.status === "LIVE" || match.status === "HALFTIME";
  const isFinished = match.status === "FINISHED";
  const homeWins = isFinished && (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWins = isFinished && (match.away_score ?? 0) > (match.home_score ?? 0);

  let dateLabel = "";
  try {
    dateLabel = format(parseISO(match.date), "MMM d, h:mm a");
  } catch {
    dateLabel = match.date;
  }

  const content = (
    <div
      className={cn(
        "w-56 shrink-0 rounded-lg border overflow-hidden bg-card transition-all",
        isLive ? "border-destructive shadow-[0_0_12px_rgba(226,75,74,0.3)]" : "border-border",
        !isTbd && "hover:border-primary/50 hover:scale-[1.02] cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/50 text-[11px] text-muted-foreground">
        <span className="truncate">{dateLabel}</span>
        {isLive && (
          <span className="flex items-center gap-1 text-destructive font-semibold">
            <LiveDot className="h-1.5 w-1.5" /> LIVE
          </span>
        )}
      </div>
      <div className="divide-y divide-border/50">
        <TeamRow
          name={match.home_team}
          flag={match.home_flag}
          score={match.home_score}
          isTbd={match.is_home_tbd}
          isWinner={homeWins}
        />
        <TeamRow
          name={match.away_team}
          flag={match.away_flag}
          score={match.away_score}
          isTbd={match.is_away_tbd}
          isWinner={awayWins}
        />
      </div>
    </div>
  );

  if (isTbd) return content;

  return <Link href={`/match/${match.id}`}>{content}</Link>;
}

export function BracketTree() {
  const { t } = useLang();
  const { data: matches, isLoading, isError, refetch } = useMatches();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">{t.failedMatchData}</p>
        <button onClick={() => refetch()} className="text-primary underline text-sm">
          {t.retry}
        </button>
      </div>
    );
  }

  const knockoutMatches = (matches ?? []).filter((m) => m.type !== "group");

  if (knockoutMatches.length === 0) {
    return (
      <div className="w-full overflow-x-auto py-10 px-4 min-h-[600px] bg-card rounded-xl border border-border flex items-center justify-center">
        <div className="text-center text-muted-foreground flex flex-col items-center">
          <div className="mb-6 p-4 rounded-full bg-primary/10 text-primary inline-flex">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 5.5-3.6 6.3-6 9h16c-2.4-2.7-6-3.5-6-9v-2.34"/>
              <path d="M11 2.5a2.5 2.5 0 1 0 2 0"/>
              <path d="M8 9h8a2 2 0 0 0 2-2V4H6v3a2 2 0 0 0 2 2z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">{t.knockoutTBD}</h2>
          <p className="max-w-md mx-auto">{t.knockoutTBDDesc}</p>
        </div>
      </div>
    );
  }

  const rounds = KNOCKOUT_ROUND_ORDER.map((round) => ({
    round,
    matches: knockoutMatches.filter((m) => m.type === round),
  })).filter((r) => r.matches.length > 0);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-6 md:gap-8 min-w-max px-1 py-2">
        {rounds.map(({ round, matches: roundMatches }) => (
          <div key={round} className="flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground text-center">
              {t[ROUND_LABEL_KEY[round]]}
            </h3>
            <div className="flex flex-col gap-4 justify-center flex-1">
              {roundMatches.map((match) => (
                <BracketMatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
