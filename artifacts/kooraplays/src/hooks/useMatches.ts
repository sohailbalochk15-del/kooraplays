import { useQuery } from "@tanstack/react-query";
import { fetchGames, fetchTeams, transformGames, type MatchData } from "../api/worldcup";

export function useMatches() {
  const teamsQuery = useQuery({
    queryKey: ["teams-v1"],
    queryFn: fetchTeams,
    staleTime: 60 * 60 * 1000,
    gcTime:   60 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const gamesQuery = useQuery({
    queryKey: ["games-v2"],
    queryFn: fetchGames,
    staleTime: 15_000,
    refetchInterval: (query) => {
      const games = (query.state.data as { games: Array<{ time_elapsed: string }> } | undefined)?.games ?? [];
      const HALFTIME_VALUES = new Set(["halftime", "half time", "half-time", "ht"]);
      const hasActive = games.some((g) => {
        const te = (g.time_elapsed ?? "").toLowerCase().trim();
        return te === "live" || HALFTIME_VALUES.has(te);
      });
      return hasActive ? 15_000 : 60_000;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const data: MatchData[] | undefined =
    teamsQuery.data && gamesQuery.data
      ? transformGames(gamesQuery.data.games, teamsQuery.data.teams)
      : undefined;

  return {
    data,
    isLoading: teamsQuery.isLoading || gamesQuery.isLoading,
    isError: teamsQuery.isError || gamesQuery.isError,
    refetch: () => { teamsQuery.refetch(); gamesQuery.refetch(); },
  };
}
