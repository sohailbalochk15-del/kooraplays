import { usePredictions, type PredictVote } from "@/hooks/usePredictions";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

export function PredictCard({ matchId, homeTeam, awayTeam }: Props) {
  const { counts, myVote, voting, castVote, pct } = usePredictions(matchId);
  const { t } = useLang();

  const options: { key: PredictVote; label: string; color: string }[] = [
    { key: "home",  label: homeTeam.length > 9 ? homeTeam.substring(0, 8) + "\u2026" : homeTeam, color: "bg-primary" },
    { key: "draw",  label: t.draw,  color: "bg-muted-foreground/50" },
    { key: "away",  label: awayTeam.length > 9 ? awayTeam.substring(0, 8) + "\u2026" : awayTeam, color: "bg-destructive/70" },
  ];

  return (
    <div className="border-t border-border/40 px-3 pt-2.5 pb-3 bg-muted/20">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 text-center">
        {myVote ? t.livePredictions : t.predictResult}
      </p>

      <div className="flex gap-1.5 mb-2.5">
        {options.map(({ key, label }) => (
          <button
            key={key}
            disabled={!!myVote || voting}
            onClick={() => castVote(key)}
            className={cn(
              "flex-1 text-[11px] font-bold py-1.5 rounded-full border transition-all duration-200",
              myVote === key
                ? "bg-primary border-primary text-primary-foreground scale-105 shadow-sm"
                : myVote
                ? "bg-transparent border-border/40 text-muted-foreground/50 cursor-default"
                : "bg-transparent border-border text-muted-foreground hover:border-primary hover:text-primary active:scale-95 cursor-pointer"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {counts.total > 0 && (
        <>
          <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
            {options.map(({ key, color }) => (
              <div
                key={key}
                className={cn(color, "transition-all duration-700 ease-in-out")}
                style={{ width: `${pct(counts[key])}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] mt-1.5">
            <span className="text-primary font-semibold">{pct(counts.home)}%</span>
            <span className="text-muted-foreground/60">{counts.total.toLocaleString()} votes</span>
            <span className="text-destructive/80 font-semibold">{pct(counts.away)}%</span>
          </div>
        </>
      )}
    </div>
  );
}
