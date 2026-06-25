import type { IncomingMessage, ServerResponse } from "node:http";

const WC_BASE = "https://worldcup26.ir/get";
const ALLOWED = new Set(["games", "teams", "groups", "stadiums"]);

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse
) {
  const url = new URL(req.url ?? "/", `https://${(req as any).headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const endpoint = parts[parts.length - 1];

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!endpoint || !ALLOWED.has(endpoint)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    const upstream = await fetch(`${WC_BASE}/${endpoint}`, {
      headers: { "User-Agent": "KooraPlays/1.0" },
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      throw new Error(`Upstream HTTP ${upstream.status}`);
    }

    const data = await upstream.text();
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    });
    res.end(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: msg }));
  }
}
