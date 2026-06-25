export const config = { runtime: "edge" };

// NOTE: Edge functions are stateless — votes reset on each cold start.
// For persistent predictions, connect to a database (KV, Supabase, etc.).
const votes = new Map<string, { home: number; draw: number; away: number; total: number }>();

function getVotes(matchId: string) {
  if (!votes.has(matchId)) votes.set(matchId, { home: 0, draw: 0, away: 0, total: 0 });
  return votes.get(matchId)!;
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const matchId = decodeURIComponent(parts[parts.length - 1]);

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method === "GET") {
    return new Response(JSON.stringify(getVotes(matchId)), { status: 200, headers: cors });
  }

  if (request.method === "POST") {
    try {
      const body = await request.json() as { vote?: string };
      const valid = ["home", "draw", "away"] as const;
      type Vote = typeof valid[number];
      if (!body.vote || !valid.includes(body.vote as Vote)) {
        return new Response(JSON.stringify({ error: "vote must be 'home', 'draw', or 'away'" }), {
          status: 400, headers: cors,
        });
      }
      const v = getVotes(matchId);
      v[body.vote as Vote]++;
      v.total++;
      return new Response(JSON.stringify(v), { status: 200, headers: cors });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400, headers: cors });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
}
