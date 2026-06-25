import { ExternalLink, ShoppingBag, Star, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type JerseyKit = "home" | "away";

export interface JerseyCardProps {
  team: string;
  country: string;
  homePrice: string;
  awayPrice: string;
  badge: string;
  tag?: "best-seller" | "new" | "limited" | null;
  rating?: number;
  reviews?: number;
  affiliateUrl?: string;
  className?: string;
}

const TAG_CONFIG = {
  "best-seller": { label: "Best Seller", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  "new":         { label: "New Arrival", className: "bg-primary/20 text-primary border-primary/30" },
  "limited":     { label: "Limited",     className: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
} as const;

export function JerseyCard({
  team,
  country,
  homePrice,
  awayPrice,
  badge,
  tag,
  rating = 4.5,
  reviews = 120,
  affiliateUrl = "#",
  className,
}: JerseyCardProps) {
  const [kit, setKit] = useState<JerseyKit>("home");

  return (
    <div
      className={cn(
        "group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5",
        className
      )}
    >
      {tag && (
        <div className="absolute top-3 start-3 z-10">
          <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border", TAG_CONFIG[tag].className)}>
            {TAG_CONFIG[tag].label}
          </span>
        </div>
      )}

      <div className="relative aspect-square bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
        <span className="text-8xl select-none drop-shadow-2xl group-hover:scale-110 transition-transform duration-500">{badge}</span>
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-card to-transparent" />
        <div className="absolute top-3 end-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-[11px] font-bold text-white">{rating}</span>
          <span className="text-[10px] text-white/60">({reviews})</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{country}</p>
          <h3 className="font-bold text-sm leading-tight mt-0.5">{team}</h3>
        </div>

        <div className="flex gap-1.5 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setKit("home")}
            className={cn(
              "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
              kit === "home"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Home
          </button>
          <button
            onClick={() => setKit("away")}
            className={cn(
              "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
              kit === "away"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Away
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Price</p>
            <p className="font-bold text-primary text-base">{kit === "home" ? homePrice : awayPrice}</p>
          </div>
          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
          >
            <a href={affiliateUrl} target="_blank" rel="noopener noreferrer sponsored">
              <ShoppingBag className="h-3.5 w-3.5" />
              Buy Now
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
