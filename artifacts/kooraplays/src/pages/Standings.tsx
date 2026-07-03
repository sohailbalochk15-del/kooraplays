import { StandingsTable } from "@/components/StandingsTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useGroups } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useLang } from "@/lib/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Standings() {
  const { data: groups, isLoading, isError, refetch } = useGroups();
  const { t } = useLang();
  useDocumentTitle(
    "Group Standings — FIFA World Cup 2026 | KooraPlays",
    "Live FIFA World Cup 2026 group standings, points, and rankings for every group."
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-1">{t.groupStandings}</h1>
        <p className="text-muted-foreground text-sm">{t.standingsDesc}</p>
      </div>

      <div className="flex gap-3 md:gap-4 mb-5 md:mb-6 text-xs md:text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>{t.advance}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>{t.possibleAdvance}</span>
        </div>
      </div>

      {isError && (
        <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-xl mb-8">
          <p className="text-destructive font-semibold mb-4">{t.failedStandings}</p>
          <Button onClick={() => refetch()} variant="outline" data-testid="button-retry-standings">{t.retry}</Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : groups && groups.length > 0 ? (
        <Tabs defaultValue={groups[0].name} className="w-full">
          <div className="overflow-x-auto pb-4 scrollbar-hide mb-4">
            <TabsList className="bg-card border border-border inline-flex w-max">
              {groups.map((g) => (
                <TabsTrigger
                  key={g.name}
                  value={g.name}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-testid={`tab-standings-${g.name}`}
                >
                  {g.name.replace("Group ", `${t.group} `)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {groups.map((g) => (
            <TabsContent key={g.name} value={g.name}>
              <StandingsTable standings={g.teams} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="text-center py-20 text-muted-foreground bg-card rounded-xl border border-border">
          <p className="text-lg">{t.noStandingsData}</p>
        </div>
      )}
    </div>
  );
}
