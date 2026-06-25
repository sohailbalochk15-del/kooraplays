export const config = { runtime: "edge" };

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ home: 0, draw: 0, away: 0, total: 0 }),
      { status: 200, headers }
    );
  }

  if (req.method === "POST") {
    try {
      const body = await req.json() as { vote?: string };
      const valid = ["home", "draw", "away"];
      if (!body.vote || !valid.includes(body.vote)) {
        return new Response(
          JSON.stringify({ error: "vote must be 'home', 'draw', or 'away'" }),
          { status: 400, headers }
        );
      }
      return new Response(
        JSON.stringify({ home: 0, draw: 0, away: 0, total: 1 }),
        { status: 200, headers }
      );
    } catch {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers,
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405, headers,
  });
}
