export const config = { runtime: "edge" };

const WC_BASE = "https://worldcup26.ir/get";
const ALLOWED = new Set(["games", "teams", "groups", "stadiums"]);

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" },
    });
  }

  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const endpoint = parts[parts.length - 1];

  const cors = { "Access-Control-Allow-Origin": "*" };

  if (!endpoint || !ALLOWED.has(endpoint)) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  try {
    const upstream = await fetch(`${WC_BASE}/${endpoint}`, {
      headers: { "User-Agent": "KooraPlays/1.0" },
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`);

    const data = await upstream.text();
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        ...cors,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
}
