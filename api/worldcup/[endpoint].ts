export const config = { runtime: "edge" };

const WC_BASE = "https://worldcup26.ir/get";
const ALLOWED = new Set(["games", "teams", "groups", "stadiums"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const endpoint = parts[parts.length - 1];

  if (!endpoint || !ALLOWED.has(endpoint)) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...CORS },
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
        ...CORS,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}
