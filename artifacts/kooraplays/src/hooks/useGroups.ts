import { useQuery } from "@tanstack/react-query";
import { fetchGroups, fetchTeams, transformGroups, type GroupStanding } from "../api/worldcup";

async function fetchGroupsWithTeams(): Promise<GroupStanding[]> {
  const [groupsRes, teamsRes] = await Promise.all([fetchGroups(), fetchTeams()]);
  return transformGroups(groupsRes.groups, teamsRes.teams);
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups-v2"],
    queryFn: fetchGroupsWithTeams,
    refetchInterval: 60000,
  });
}
