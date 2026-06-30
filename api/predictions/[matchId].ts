export const config = { runtime: "edge" };

declare const process: { env: Record<string, string | undefined> };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const headers = { "Content-Type": "application/json", ...CORS };

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "";

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function getCounts(matchId: string): Promise<{ home: number; draw: number; away: number; total: number }> {
  const empty = { home: 0, draw: 0, away: 0, total: 0 };
  if (!SUPABASE_URL || !SUPABASE_KEY) return empty;

  try {
    // Fetch all individual prediction rows and count in JS.
    // Using `select=outcome,count` (PostgREST column selection) was wrong because
    // "count" is not a column — it returned null for every row, so all counts were 0.
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_predictions?match_id=eq.${encodeURIComponent(matchId)}&select=outcome`,
      { headers: sbHeaders() }
    );
    if (!res.ok) return empty;

    const rows: { outcome: string }[] = await res.json();
    const result = { ...empty };
    for (const row of rows) {
      if (row.outcome === "home")      result.home++;
      else if (row.outcome === "draw") result.draw++;
      else if (row.outcome === "away") result.away++;
    }
    result.total = result.home + result.draw + result.away;
    return result;
  } catch {
    return empty;
  }
}

async function incrementCount(matchId: string, vote: string): Promise<{ home: number; draw: number; away: number; total: number } | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_prediction`, {
      method: "POST",
      headers: sbHeaders(),
      body: JSON.stringify({ p_match_id: matchId, p_outcome: vote }),
    });
    if (!res.ok) return null;
    return await res.json() as { home: number; draw: number; away: number; total: number };
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const matchId = decodeURIComponent(parts[parts.length - 1] ?? "");

  if (!matchId || matchId === "undefined") {
    return new Response(JSON.stringify({ error: "Missing matchId" }), { status: 400, headers });
  }

  if (req.method === "GET") {
    const counts = await getCounts(matchId);
    return new Response(JSON.stringify(counts), { status: 200, headers });
  }

  if (req.method === "POST") {
    try {
      const body = (await req.json()) as { vote?: string };
      const valid = ["home", "draw", "away"];
      if (!body.vote || !valid.includes(body.vote)) {
        return new Response(
          JSON.stringify({ error: "vote must be 'home', 'draw', or 'away'" }),
          { status: 400, headers }
        );
      }

      const result = await incrementCount(matchId, body.vote);
      if (!result) {
        return new Response(
          JSON.stringify({ error: "Failed to record prediction — Supabase unavailable" }),
          { status: 502, headers }
        );
      }
      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
}
