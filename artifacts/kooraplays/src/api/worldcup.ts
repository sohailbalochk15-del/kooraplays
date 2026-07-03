import { fromZonedTime } from "date-fns-tz";

const API_BASE = "/api/worldcup";

export interface RawGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name_en?: string;
  away_team_name_en?: string;
  home_team_label?: string;
  away_team_label?: string;
  home_score: string;
  away_score: string;
  finished: string;
  time_elapsed: string;
  local_date: string;
  group: string;
  type: string;
  stadium_id: string;
}

export interface RawTeam {
  id: string;
  name_en: string;
  flag: string;
  iso2: string;
  groups: string;
  fifa_code: string;
}

export interface RawGroupTeam {
  team_id: string;
  mp: string;
  w: string;
  l: string;
  d: string;
  pts: string;
  gf: string;
  ga: string;
  gd: string;
}

export interface RawGroup {
  name: string;
  teams: RawGroupTeam[];
}

export interface MatchData {
  id: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  status: "LIVE" | "UPCOMING" | "FINISHED" | "HALFTIME";
  date: string;
  venue: string;
  group: string;
  home_flag?: string;
  away_flag?: string;
  type: string;
  is_home_tbd?: boolean;
  is_away_tbd?: boolean;
}

export const KNOCKOUT_ROUND_ORDER = ["r32", "r16", "qf", "sf", "third", "final"] as const;
export type KnockoutRound = (typeof KNOCKOUT_ROUND_ORDER)[number];

export interface TeamStanding {
  id: string;
  name: string;
  flag: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface GroupStanding {
  name: string;
  teams: TeamStanding[];
}

// The worldcup26.ir API stores local_date values in each stadium's own local kickoff
// time (not UTC, not a single fixed offset). To get the correct absolute UTC instant
// for a match we must convert using that specific venue's IANA time zone so daylight
// saving time is handled correctly for the match date.
const STADIUM_INFO: Record<string, { name: string; timeZone: string }> = {
  "1":  { name: "AT&T Stadium, Dallas",               timeZone: "America/Chicago" },
  "2":  { name: "SoFi Stadium, Los Angeles",           timeZone: "America/Los_Angeles" },
  "3":  { name: "MetLife Stadium, New York",           timeZone: "America/New_York" },
  "4":  { name: "Levi's Stadium, San Francisco",       timeZone: "America/Los_Angeles" },
  "5":  { name: "Lincoln Financial Field, Philadelphia", timeZone: "America/New_York" },
  "6":  { name: "Arrowhead Stadium, Kansas City",      timeZone: "America/Chicago" },
  "7":  { name: "Rose Bowl, Los Angeles",              timeZone: "America/Los_Angeles" },
  "8":  { name: "Hard Rock Stadium, Miami",            timeZone: "America/New_York" },
  "9":  { name: "Gillette Stadium, Boston",            timeZone: "America/New_York" },
  "10": { name: "NRG Stadium, Houston",                timeZone: "America/Chicago" },
  "11": { name: "BC Place, Vancouver",                 timeZone: "America/Vancouver" },
  "12": { name: "BMO Field, Toronto",                  timeZone: "America/Toronto" },
  "13": { name: "Estadio Azteca, Mexico City",         timeZone: "America/Mexico_City" },
  "14": { name: "Estadio AKRON, Guadalajara",          timeZone: "America/Mexico_City" },
  "15": { name: "Estadio Monterrey, Monterrey",        timeZone: "America/Monterrey" },
  "16": { name: "Allegiant Stadium, Las Vegas",        timeZone: "America/Los_Angeles" },
};

const STADIUM_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(STADIUM_INFO).map(([id, info]) => [id, info.name])
);

function parseLocalDate(localDate: string, stadiumId: string): string {
  try {
    const spaceIdx = localDate.indexOf(" ");
    const datePart = spaceIdx !== -1 ? localDate.slice(0, spaceIdx) : localDate;
    const timePart = spaceIdx !== -1 ? localDate.slice(spaceIdx + 1) : "00:00";
    const [month, day, year] = datePart.split("/");
    if (!month || !day || !year) return new Date().toISOString();

    const timeZone = STADIUM_INFO[stadiumId]?.timeZone ?? "America/Chicago";
    const isoLocal = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}:00`;
    return fromZonedTime(isoLocal, timeZone).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

const HALFTIME_VALUES = new Set(["halftime", "half time", "half-time", "ht"]);

function getStatus(game: RawGame): "LIVE" | "UPCOMING" | "FINISHED" | "HALFTIME" {
  const te = (game.time_elapsed ?? "").toLowerCase().trim();
  if (HALFTIME_VALUES.has(te)) return "HALFTIME";
  if (te === "live") return "LIVE";
  if (game.finished === "TRUE" || game.finished === "true") return "FINISHED";
  return "UPCOMING";
}

export function transformGames(games: RawGame[], teams: RawTeam[]): MatchData[] {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  return games.map((g) => {
    const homeTeam = teamMap.get(g.home_team_id);
    const awayTeam = teamMap.get(g.away_team_id);
    const status = getStatus(g);
    const isHomeTbd = g.home_team_id === "0" || !g.home_team_name_en;
    const isAwayTbd = g.away_team_id === "0" || !g.away_team_name_en;
    const isKnockout = g.type !== "group";
    return {
      id: g.id,
      home_team: g.home_team_name_en ?? g.home_team_label ?? "TBD",
      away_team: g.away_team_name_en ?? g.away_team_label ?? "TBD",
      home_score: !isHomeTbd && !isAwayTbd && status !== "UPCOMING" ? (parseInt(g.home_score, 10) || 0) : undefined,
      away_score: !isHomeTbd && !isAwayTbd && status !== "UPCOMING" ? (parseInt(g.away_score, 10) || 0) : undefined,
      status: isHomeTbd || isAwayTbd ? "UPCOMING" : status,
      date: parseLocalDate(g.local_date, g.stadium_id),
      venue: STADIUM_NAMES[g.stadium_id] ?? `Stadium ${g.stadium_id}`,
      group: isKnockout ? g.group : `Group ${g.group}`,
      home_flag: homeTeam?.flag,
      away_flag: awayTeam?.flag,
      type: g.type,
      is_home_tbd: isHomeTbd,
      is_away_tbd: isAwayTbd,
    };
  });
}

const ADVANCE_LABEL_PATTERN = /^(Winner|Loser) Match (\d+)$/i;

function resolveSlot(label: string, byId: Map<string, MatchData>): { name: string; flag?: string } | null {
  const parsed = ADVANCE_LABEL_PATTERN.exec(label);
  if (!parsed) return null;
  const [, kind, refId] = parsed;
  const ref = byId.get(refId);
  if (!ref || ref.is_home_tbd || ref.is_away_tbd) return null;
  if (ref.home_score === undefined || ref.away_score === undefined) return null;
  if (ref.home_score === ref.away_score) return null;

  const homeAdvances = ref.home_score > ref.away_score;
  const wantsWinner = kind.toLowerCase() === "winner";
  const homeQualifies = wantsWinner ? homeAdvances : !homeAdvances;

  return homeQualifies
    ? { name: ref.home_team, flag: ref.home_flag }
    : { name: ref.away_team, flag: ref.away_flag };
}

export function resolveKnockoutBracket(matches: MatchData[]): MatchData[] {
  const byId = new Map(matches.map((m) => [m.id, { ...m }]));

  for (const round of KNOCKOUT_ROUND_ORDER) {
    for (const match of byId.values()) {
      if (match.type !== round) continue;

      if (match.is_home_tbd) {
        const resolved = resolveSlot(match.home_team, byId);
        if (resolved) {
          match.home_team = resolved.name;
          match.home_flag = resolved.flag;
          match.is_home_tbd = false;
        }
      }
      if (match.is_away_tbd) {
        const resolved = resolveSlot(match.away_team, byId);
        if (resolved) {
          match.away_team = resolved.name;
          match.away_flag = resolved.flag;
          match.is_away_tbd = false;
        }
      }
    }
  }

  return Array.from(byId.values());
}

export function transformGroups(groups: RawGroup[], teams: RawTeam[]): GroupStanding[] {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  return groups
    .map((g) => ({
      name: `Group ${g.name}`,
      teams: g.teams
        .map((t) => {
          const team = teamMap.get(t.team_id);
          return {
            id: t.team_id,
            name: team?.name_en ?? `Team ${t.team_id}`,
            flag: team?.flag ?? "",
            mp: parseInt(t.mp, 10) || 0,
            w: parseInt(t.w, 10) || 0,
            d: parseInt(t.d, 10) || 0,
            l: parseInt(t.l, 10) || 0,
            gf: parseInt(t.gf, 10) || 0,
            ga: parseInt(t.ga, 10) || 0,
            gd: parseInt(t.gd, 10) || 0,
            pts: parseInt(t.pts, 10) || 0,
          };
        })
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchGames(): Promise<{ games: RawGame[] }> {
  const res = await fetch(`${API_BASE}/games`);
  if (!res.ok) throw new Error("Failed to fetch games");
  return res.json();
}

export async function fetchGroups(): Promise<{ groups: RawGroup[] }> {
  const res = await fetch(`${API_BASE}/groups`);
  if (!res.ok) throw new Error("Failed to fetch groups");
  return res.json();
}

export async function fetchTeams(): Promise<{ teams: RawTeam[] }> {
  const res = await fetch(`${API_BASE}/teams`);
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

export async function fetchStadiums() {
  const res = await fetch(`${API_BASE}/stadiums`);
  if (!res.ok) throw new Error("Failed to fetch stadiums");
  return res.json();
}
