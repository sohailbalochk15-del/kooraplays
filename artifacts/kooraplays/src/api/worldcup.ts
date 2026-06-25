const API_BASE = "/api/worldcup";

export interface RawGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name_en: string;
  away_team_name_en: string;
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
}

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

// The worldcup26.ir API stores all local_date values in a single fixed offset of UTC-6
// regardless of the actual stadium time zone. Both a Dallas (CDT) and New York (EDT)
// match show identical raw times yet kick off simultaneously in UTC — only possible
// with one fixed offset applied to every game.
const API_UTC_OFFSET = "-06:00";

const STADIUM_NAMES: Record<string, string> = {
  "1":  "AT&T Stadium, Dallas",
  "2":  "SoFi Stadium, Los Angeles",
  "3":  "MetLife Stadium, New York",
  "4":  "Levi's Stadium, San Francisco",
  "5":  "Lincoln Financial Field, Philadelphia",
  "6":  "Arrowhead Stadium, Kansas City",
  "7":  "Rose Bowl, Los Angeles",
  "8":  "Hard Rock Stadium, Miami",
  "9":  "Gillette Stadium, Boston",
  "10": "NRG Stadium, Houston",
  "11": "BC Place, Vancouver",
  "12": "BMO Field, Toronto",
  "13": "Estadio Azteca, Mexico City",
  "14": "Estadio AKRON, Guadalajara",
  "15": "Estadio Monterrey, Monterrey",
  "16": "Allegiant Stadium, Las Vegas",
};

function parseLocalDate(localDate: string): string {
  try {
    const spaceIdx = localDate.indexOf(" ");
    const datePart = spaceIdx !== -1 ? localDate.slice(0, spaceIdx) : localDate;
    const timePart = spaceIdx !== -1 ? localDate.slice(spaceIdx + 1) : "00:00";
    const [month, day, year] = datePart.split("/");
    if (!month || !day || !year) return new Date().toISOString();
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}:00${API_UTC_OFFSET}`;
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
    return {
      id: g.id,
      home_team: g.home_team_name_en,
      away_team: g.away_team_name_en,
      home_score: status !== "UPCOMING" ? (parseInt(g.home_score, 10) || 0) : undefined,
      away_score: status !== "UPCOMING" ? (parseInt(g.away_score, 10) || 0) : undefined,
      status,
      date: parseLocalDate(g.local_date),
      venue: STADIUM_NAMES[g.stadium_id] ?? `Stadium ${g.stadium_id}`,
      group: `Group ${g.group}`,
      home_flag: homeTeam?.flag,
      away_flag: awayTeam?.flag,
      type: g.type,
    };
  });
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
