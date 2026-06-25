import type { IncomingMessage, ServerResponse } from "node:http";

type Vote = "home" | "draw" | "away";
interface VoteCounts { home: number; draw: number; away: number; total: number }

const votes = new Map<string, VoteCounts>();

function getVotes(matchId: string): VoteCounts {
  if (!votes.has(matchId)) {
    votes.set(matchId, { home: 0, draw: 0, away: 0, total: 0 });
  }
  return votes.get(matchId)!;
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse
) {
  const url = new URL(req.url ?? "/", `https://${(req as any).headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const matchId = decodeURIComponent(parts[parts.length - 1]);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify(getVotes(matchId)));
    return;
  }

  if (req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += String(chunk);
    try {
      const parsed = JSON.parse(body) as { vote?: string };
      const valid: Vote[] = ["home", "draw", "away"];
      if (!parsed.vote || !valid.includes(parsed.vote as Vote)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "vote must be 'home', 'draw', or 'away'" }));
        return;
      }
      const v = getVotes(matchId);
      v[parsed.vote as Vote]++;
      v.total++;
      res.writeHead(200);
      res.end(JSON.stringify(v));
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Invalid body" }));
    }
    return;
  }

  res.writeHead(405);
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
