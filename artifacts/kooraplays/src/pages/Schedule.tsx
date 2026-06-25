import { useMatches } from "@/hooks/useMatches";
import { MatchCard } from "@/components/MatchCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";

const GROUP_KEYS = ["ALL", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default function Schedule() {
  const { data: matches, isLoading, isError, refetch } = useMatches();
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const filtered = (matches ?? []).filter((m) => {
    if (filter !== "ALL" && m.group !== `Group ${filter}`) return false;
    const q = search.toLowerCase();
    if (q && !m.home_team.toLowerCase().includes(q) && !m.away_team.toLowerCase().includes(q)) return false;
    return true;
  });

  const groupMatches    = filtered.filter((m) => m.type === "group");
  const knockoutMatches = filtered.filter((m) => m.type !== "group");

  const liveIndexMap = new Map<string | number, 1 | 2>();
  let liveCounter = 0;
  [...groupMatches, ...knockoutMatches].forEach((m) => {
    if ((m.status === "LIVE" || m.status === "HALFTIME") && liveCounter < 2) {
      liveCounter++;
      liveIndexMap.set(m.id, liveCounter as 1 | 2);
    }
  });

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-1">{t.matchSchedule}</h1>
          <p className="text-muted-foreground text-xs md:text-sm">{t.allTimesIn}: {userTz}</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchTeams}
            className="ps-9 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-teams"
          />
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-8 w-full">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="bg-card border border-border w-max inline-flex">
            {GROUP_KEYS.map((g) => (
              <TabsTrigger
                key={g}
                value={g}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid={`tab-group-${g}`}
              >
                {g === "ALL" ? t.all : `${t.group} ${g}`}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {isError && (
        <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-xl mb-8">
          <p className="text-destructive font-semibold mb-4">{t.failedSchedule}</p>
          <Button onClick={() => refetch()} variant="outline" data-testid="button-retry">{t.retry}</Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {groupMatches.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4 text-muted-foreground uppercase tracking-widest text-sm">
                {t.groupStage}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupMatches.map((match, i) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    data-testid={`card-match-${match.id}`}
                  >
                    <MatchCard match={match} liveIndex={liveIndexMap.get(match.id)} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {knockoutMatches.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 text-muted-foreground uppercase tracking-widest text-sm">
                {t.knockoutStage}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {knockoutMatches.map((match, i) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    data-testid={`card-match-knockout-${match.id}`}
                  >
                    <MatchCard match={match} liveIndex={liveIndexMap.get(match.id)} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {groupMatches.length === 0 && knockoutMatches.length === 0 && (
            <div className="text-center py-20 text-muted-foreground bg-card rounded-xl border border-border">
              <p className="text-lg">{t.noMatchesFound}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
