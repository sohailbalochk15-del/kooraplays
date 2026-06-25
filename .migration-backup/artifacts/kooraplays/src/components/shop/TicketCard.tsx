import { ExternalLink, MapPin, Calendar, Ticket, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export interface TicketCardProps {
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  matchDate: Date;
  venue: string;
  city: string;
  priceRange: string;
  round: string;
  roundColor?: "group" | "knockout" | "semi" | "final";
  availability?: number;
  hot?: boolean;
  affiliateUrl?: string;
  className?: string;
}

const ROUND_STYLES = {
  group:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
  knockout:"bg-purple-500/15 text-purple-400 border-purple-500/30",
  semi:    "bg-amber-500/15 text-amber-400 border-amber-500/30",
  final:   "bg-primary/20 text-primary border-primary/30",
} as const;

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { d, h, m, s };
  };
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setLeft(calc()), 1_000);
    return () => clearInterval(id);
  });
  return left;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-black tabular-nums leading-none">{String(value).padStart(2, "0")}</span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

export function TicketCard({
  homeTeam,
  awayTeam,
  homeFlag,
  awayFlag,
  matchDate,
  venue,
  city,
  priceRange,
  round,
  roundColor = "group",
  availability,
  hot = false,
  affiliateUrl = "#",
  className,
}: TicketCardProps) {
  const left = useCountdown(matchDate);
  const dateStr = matchDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = matchDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={cn(
        "group flex flex-col bg-card border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
        hot
          ? "border-amber-500/40 hover:border-amber-500/70 hover:shadow-amber-500/10"
          : "border-border hover:border-primary/50 hover:shadow-primary/10",
        className
      )}
    >
      <div className={cn("flex items-center justify-between px-4 py-2.5 border-b", hot ? "border-amber-500/20 bg-amber-500/5" : "border-border/60 bg-muted/30")}>
        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border", ROUND_STYLES[roundColor])}>
          {round}
        </span>
        {hot && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            <Zap className="h-3 w-3 fill-amber-400" /> Hot
          </span>
        )}
        {availability !== undefined && availability <= 20 && (
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
            Only {availability} left
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex flex-col items-center gap-1 flex-1">
          <span className="text-4xl">{homeFlag}</span>
          <span className="text-xs font-semibold text-center leading-tight">{homeTeam}</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-2 shrink-0">
          <span className="text-[10px] font-black text-muted-foreground tracking-widest bg-muted px-2.5 py-1 rounded-lg">VS</span>
        </div>
        <div className="flex flex-col items-center gap-1 flex-1">
          <span className="text-4xl">{awayFlag}</span>
          <span className="text-xs font-semibold text-center leading-tight">{awayTeam}</span>
        </div>
      </div>

      {left && (
        <div className="mx-4 mb-3 flex items-center justify-center gap-3 bg-muted/50 rounded-xl py-2.5 border border-border/50">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <CountdownUnit value={left.d} label="d" />
          <span className="text-muted-foreground font-bold text-sm">:</span>
          <CountdownUnit value={left.h} label="h" />
          <span className="text-muted-foreground font-bold text-sm">:</span>
          <CountdownUnit value={left.m} label="m" />
          <span className="text-muted-foreground font-bold text-sm">:</span>
          <CountdownUnit value={left.s} label="s" />
        </div>
      )}

      <div className="flex flex-col gap-1 px-4 pb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span>{dateStr} · {timeStr}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="truncate">{venue}, {city}</span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 px-4 pb-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">From</p>
          <p className="font-bold text-primary text-base">{priceRange}</p>
        </div>
        <Button
          asChild
          size="sm"
          className={cn(
            "gap-1.5 font-semibold rounded-xl",
            hot
              ? "bg-amber-500 text-black hover:bg-amber-400"
              : "border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground bg-transparent border"
          )}
        >
          <a href={affiliateUrl} target="_blank" rel="noopener noreferrer sponsored">
            <Ticket className="h-3.5 w-3.5" />
            Find Tickets
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </Button>
      </div>
    </div>
  );
}
