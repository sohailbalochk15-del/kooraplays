import { ExternalLink, MapPin, Star, Plane, Hotel, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TravelCardProps {
  name: string;
  location: string;
  city: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviews: number;
  nights: number;
  spotsLeft?: number;
  includes: string[];
  highlight: string;
  emoji: string;
  tag?: "best-value" | "popular" | "exclusive" | null;
  affiliateUrl?: string;
  className?: string;
}

const TAG_CONFIG = {
  "best-value": { label: "Best Value", className: "bg-primary/20 text-primary border-primary/30" },
  "popular":    { label: "🔥 Popular",  className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  "exclusive":  { label: "✦ Exclusive", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
} as const;

const INCLUDE_ICONS: Record<string, React.ReactNode> = {
  hotel:    <Hotel className="h-3 w-3" />,
  flights:  <Plane className="h-3 w-3" />,
  tickets:  <span className="text-[10px]">🎟️</span>,
  transfer: <span className="text-[10px]">🚌</span>,
  guide:    <Users className="h-3 w-3" />,
};

export function TravelCard({
  name,
  location,
  city,
  price,
  originalPrice,
  rating,
  reviews,
  nights,
  spotsLeft,
  includes,
  highlight,
  emoji,
  tag,
  affiliateUrl = "#",
  className,
}: TravelCardProps) {
  return (
    <div
      className={cn(
        "group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5",
        className
      )}
    >
      <div className="relative aspect-video bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_60%_40%,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
        <span className="text-7xl select-none group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl">{emoji}</span>
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          {tag && (
            <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border backdrop-blur-sm", TAG_CONFIG[tag].className)}>
              {TAG_CONFIG[tag].label}
            </span>
          )}
          {spotsLeft !== undefined && spotsLeft <= 5 && (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 rounded-full backdrop-blur-sm uppercase tracking-wider">
              {spotsLeft} spots left!
            </span>
          )}
        </div>

        <div className="absolute bottom-3 end-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-xs font-bold text-white">{rating.toFixed(1)}</span>
          <span className="text-[10px] text-white/60">({reviews})</span>
        </div>

        <div className="absolute bottom-3 start-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
          <MapPin className="h-3 w-3 text-primary" />
          <span className="text-xs font-semibold text-white">{city}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 flex-1">
        <div>
          <h3 className="font-bold text-sm leading-tight">{name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{location} · {nights} nights</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {includes.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded-full capitalize"
            >
              {INCLUDE_ICONS[item] ?? <Tag className="h-3 w-3" />}
              {item}
            </span>
          ))}
        </div>

        <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2 border border-border/40 leading-relaxed">
          ✨ {highlight}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Per person</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-bold text-primary text-base">{price}</p>
              {originalPrice && (
                <p className="text-xs text-muted-foreground line-through">{originalPrice}</p>
              )}
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
          >
            <a href={affiliateUrl} target="_blank" rel="noopener noreferrer sponsored">
              <Plane className="h-3.5 w-3.5" />
              Book Now
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
