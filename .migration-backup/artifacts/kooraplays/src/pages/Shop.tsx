import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Ticket, Plane, Info, Search, TrendingUp, Star, Globe } from "lucide-react";
import { JerseyCard } from "@/components/shop/JerseyCard";
import { TicketCard } from "@/components/shop/TicketCard";
import { TravelCard } from "@/components/shop/TravelCard";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const JERSEYS = [
  { team: "Morocco Home Kit 2026",  country: "Morocco",      homePrice: "From $89", awayPrice: "From $79", badge: "🇲🇦", tag: "best-seller" as const, rating: 4.9, reviews: 312 },
  { team: "Brazil Home Kit 2026",   country: "Brazil",       homePrice: "From $94", awayPrice: "From $84", badge: "🇧🇷", tag: "new" as const,         rating: 4.8, reviews: 289 },
  { team: "France Home Kit 2026",   country: "France",       homePrice: "From $94", awayPrice: "From $84", badge: "🇫🇷", tag: null,                   rating: 4.7, reviews: 198 },
  { team: "Argentina Home Kit 2026",country: "Argentina",    homePrice: "From $99", awayPrice: "From $89", badge: "🇦🇷", tag: "best-seller" as const, rating: 4.9, reviews: 401 },
  { team: "Spain Home Kit 2026",    country: "Spain",        homePrice: "From $89", awayPrice: "From $79", badge: "🇪🇸", tag: null,                   rating: 4.6, reviews: 154 },
  { team: "Saudi Arabia Kit 2026",  country: "Saudi Arabia", homePrice: "From $79", awayPrice: "From $69", badge: "🇸🇦", tag: "limited" as const,     rating: 4.8, reviews: 267 },
  { team: "Germany Home Kit 2026",  country: "Germany",      homePrice: "From $94", awayPrice: "From $84", badge: "🇩🇪", tag: "new" as const,         rating: 4.7, reviews: 183 },
  { team: "Portugal Home Kit 2026", country: "Portugal",     homePrice: "From $94", awayPrice: "From $84", badge: "🇵🇹", tag: null,                   rating: 4.7, reviews: 210 },
  { team: "England Home Kit 2026",  country: "England",      homePrice: "From $94", awayPrice: "From $84", badge: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tag: null,                   rating: 4.6, reviews: 171 },
];

const now = Date.now();
const day = 86_400_000;

const TICKETS = [
  {
    homeTeam: "Morocco",   awayTeam: "Portugal",  homeFlag: "🇲🇦", awayFlag: "🇵🇹",
    matchDate: new Date(now + 2  * day + 3 * 3600_000),
    venue: "MetLife Stadium", city: "New York",    priceRange: "$120+", round: "Group E",
    roundColor: "group" as const, availability: 48, hot: true,
  },
  {
    homeTeam: "Brazil",    awayTeam: "Argentina", homeFlag: "🇧🇷", awayFlag: "🇦🇷",
    matchDate: new Date(now + 4  * day + 5 * 3600_000),
    venue: "AT&T Stadium", city: "Dallas",        priceRange: "$220+", round: "Group F",
    roundColor: "group" as const, availability: 12, hot: true,
  },
  {
    homeTeam: "France",    awayTeam: "England",   homeFlag: "🇫🇷", awayFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    matchDate: new Date(now + 7  * day + 2 * 3600_000),
    venue: "SoFi Stadium", city: "Los Angeles",  priceRange: "$180+", round: "Group D",
    roundColor: "group" as const, availability: 95,
  },
  {
    homeTeam: "Spain",     awayTeam: "Germany",   homeFlag: "🇪🇸", awayFlag: "🇩🇪",
    matchDate: new Date(now + 14 * day + 6 * 3600_000),
    venue: "Levi's Stadium", city: "San Francisco", priceRange: "$260+", round: "Round of 32",
    roundColor: "knockout" as const, availability: 8, hot: true,
  },
  {
    homeTeam: "TBD",       awayTeam: "TBD",       homeFlag: "🏆", awayFlag: "🏆",
    matchDate: new Date(now + 22 * day + 5 * 3600_000),
    venue: "MetLife Stadium", city: "New York",   priceRange: "$800+", round: "Semi-Final",
    roundColor: "semi" as const, availability: 4,
  },
  {
    homeTeam: "TBD",       awayTeam: "TBD",       homeFlag: "🏆", awayFlag: "🏆",
    matchDate: new Date(now + 26 * day + 5 * 3600_000),
    venue: "MetLife Stadium", city: "New York",   priceRange: "$1,200+", round: "⚽ THE FINAL",
    roundColor: "final" as const, availability: 2, hot: true,
  },
];

const TRAVEL = [
  {
    name: "New York World Cup Package",  location: "New York, USA",    city: "New York",
    price: "From $1,890", originalPrice: "$2,490",
    rating: 4.9, reviews: 88, nights: 5, spotsLeft: 3,
    includes: ["hotel", "tickets", "transfer"],
    highlight: "4 group stage matches + 4★ hotel near MetLife Stadium",
    emoji: "🗽", tag: "popular" as const,
  },
  {
    name: "Los Angeles Fan Getaway",     location: "Los Angeles, USA", city: "Los Angeles",
    price: "From $1,490", originalPrice: "$1,890",
    rating: 4.7, reviews: 62, nights: 4, spotsLeft: 7,
    includes: ["hotel", "tickets", "guide"],
    highlight: "2 SoFi Stadium matches + Hollywood Boulevard hotel",
    emoji: "🌴", tag: "best-value" as const,
  },
  {
    name: "Miami Beach Party Package",   location: "Miami, USA",       city: "Miami",
    price: "From $1,290", originalPrice: undefined,
    rating: 4.6, reviews: 55, nights: 4, spotsLeft: 14,
    includes: ["hotel", "tickets", "transfer"],
    highlight: "Oceanfront hotel + 2 group stage tickets + pool party",
    emoji: "🏖️", tag: null,
  },
  {
    name: "Dallas Cowboys Experience",   location: "Dallas, USA",      city: "Dallas",
    price: "From $1,190", originalPrice: "$1,490",
    rating: 4.5, reviews: 41, nights: 3, spotsLeft: 18,
    includes: ["hotel", "tickets"],
    highlight: "AT&T Stadium VIP gate + downtown hotel",
    emoji: "🤠", tag: null,
  },
  {
    name: "Toronto Cross-Border Trip",   location: "Toronto, Canada",  city: "Toronto",
    price: "From $1,090", originalPrice: undefined,
    rating: 4.5, reviews: 37, nights: 3, spotsLeft: 22,
    includes: ["hotel", "tickets", "transfer"],
    highlight: "BMO Field match + Niagara Falls day trip",
    emoji: "🍁", tag: null,
  },
  {
    name: "Final Week VIP Package",      location: "New York, USA",    city: "New York",
    price: "From $4,990", originalPrice: "$6,500",
    rating: 5.0, reviews: 19, nights: 7, spotsLeft: 2,
    includes: ["flights", "hotel", "tickets", "guide", "transfer"],
    highlight: "Semi-final + Final tickets · 5★ hotel · private transfers",
    emoji: "🏆", tag: "exclusive" as const,
  },
];

const CATEGORIES = [
  { id: "all",     label: "All",             icon: <Globe  className="h-4 w-4" /> },
  { id: "jerseys", label: "Jerseys",         icon: <ShoppingBag className="h-4 w-4" /> },
  { id: "tickets", label: "Match Tickets",   icon: <Ticket className="h-4 w-4" /> },
  { id: "travel",  label: "Travel Packages", icon: <Plane  className="h-4 w-4" /> },
] as const;

type Category = typeof CATEGORIES[number]["id"];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const fadeUp  = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <span className="text-xl md:text-2xl font-black text-white">{value}</span>
      <span className="text-[11px] text-white/60 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function SectionHeading({ icon, title, subtitle, count }: { icon: React.ReactNode; title: string; subtitle: string; count: number }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-primary/15 rounded-xl text-primary">{icon}</div>
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          <span className="text-xs font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{count}</span>
        </div>
        <p className="text-muted-foreground text-sm ms-14">{subtitle}</p>
      </div>
    </div>
  );
}

export default function Shop() {
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const jerseyRef = useRef<HTMLElement>(null);
  const ticketRef = useRef<HTMLElement>(null);
  const travelRef = useRef<HTMLElement>(null);

  const q = search.toLowerCase();

  const filteredJerseys = JERSEYS.filter(j =>
    !q || j.team.toLowerCase().includes(q) || j.country.toLowerCase().includes(q)
  );
  const filteredTickets = TICKETS.filter(t =>
    !q || t.homeTeam.toLowerCase().includes(q) || t.awayTeam.toLowerCase().includes(q) ||
    t.city.toLowerCase().includes(q) || t.round.toLowerCase().includes(q)
  );
  const filteredTravel = TRAVEL.filter(p =>
    !q || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)
  );

  const showJerseys = category === "all" || category === "jerseys";
  const showTickets = category === "all" || category === "tickets";
  const showTravel  = category === "all" || category === "travel";

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCategory = (id: Category) => {
    setCategory(id);
    setTimeout(() => {
      if (id === "jerseys") scrollTo(jerseyRef);
      if (id === "tickets") scrollTo(ticketRef);
      if (id === "travel")  scrollTo(travelRef);
    }, 50);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-background border-b border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-10 md:py-16 relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">World Cup 2026 Store</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3 tracking-tight">
              Your Tournament,<br />
              <span className="text-primary">Your Way.</span>
            </h1>
            <p className="text-white/60 text-sm md:text-base max-w-lg mb-8">
              Official jerseys, match tickets, and curated travel packages — everything you need for FIFA World Cup 2026.
            </p>
            <div className="flex flex-wrap gap-3">
              <StatBadge value={String(JERSEYS.length)} label="Jerseys" />
              <StatBadge value={String(TICKETS.length)} label="Ticket Listings" />
              <StatBadge value={String(TRAVEL.length)} label="Travel Packages" />
              <StatBadge value="16" label="Host Cities" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="sticky top-14 md:top-16 z-30 bg-background/95 backdrop-blur border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 py-3 overflow-x-auto scrollbar-hide">
            <div className="relative shrink-0 flex-1 max-w-xs">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search jerseys, teams, cities..."
                className="ps-9 h-9 text-sm bg-muted/50 border-border/60 rounded-xl"
              />
            </div>
            <div className="flex gap-1.5 shrink-0">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
                    category === cat.id
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-16 flex-1">
        <AnimatePresence>
          {showJerseys && filteredJerseys.length > 0 && (
            <motion.section
              key="jerseys"
              ref={jerseyRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SectionHeading
                icon={<ShoppingBag className="h-5 w-5" />}
                title="⚽ Official Jerseys"
                subtitle="Authentic kits — toggle between Home and Away editions."
                count={filteredJerseys.length}
              />
              <motion.div variants={stagger} initial="hidden" animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredJerseys.map(j => (
                  <motion.div key={j.team} variants={fadeUp}>
                    <JerseyCard {...j} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {showTickets && filteredTickets.length > 0 && (
            <motion.section
              key="tickets"
              ref={ticketRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SectionHeading
                icon={<Ticket className="h-5 w-5" />}
                title="🎟️ Match Tickets"
                subtitle="Live countdown to kickoff. Limited seats — book early."
                count={filteredTickets.length}
              />
              <motion.div variants={stagger} initial="hidden" animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTickets.map((t, i) => (
                  <motion.div key={i} variants={fadeUp}>
                    <TicketCard {...t} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {showTravel && filteredTravel.length > 0 && (
            <motion.section
              key="travel"
              ref={travelRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SectionHeading
                icon={<Plane className="h-5 w-5" />}
                title="✈️ Travel Packages"
                subtitle="All-in-one bundles: hotel, transfer, and match tickets."
                count={filteredTravel.length}
              />
              <motion.div variants={stagger} initial="hidden" animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTravel.map((p, i) => (
                  <motion.div key={i} variants={fadeUp}>
                    <TravelCard {...p} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {filteredJerseys.length === 0 && filteredTickets.length === 0 && filteredTravel.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <span className="text-5xl">🔍</span>
              <p className="text-lg font-bold">No results for "{search}"</p>
              <p className="text-muted-foreground text-sm">Try a team name, city, or category.</p>
              <button onClick={() => setSearch("")} className="text-primary text-sm font-semibold hover:underline">
                Clear search
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="container mx-auto px-4 pb-10">
        <div className="flex items-start gap-2.5 text-xs text-muted-foreground max-w-2xl border-t border-border/40 pt-6">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50" />
          <p>
            <span className="font-semibold text-foreground/70">Affiliate Disclosure:</span>{" "}
            KooraPlays may earn a commission from purchases made through links on this page,
            at no extra cost to you. Prices, availability, and deals are subject to change.
            Always verify on the merchant's site before purchasing.
          </p>
        </div>
      </div>
    </div>
  );
}
