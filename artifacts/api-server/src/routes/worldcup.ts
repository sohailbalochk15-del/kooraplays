import { Router } from "express";

const router = Router();

const WC_BASE = "https://worldcup26.ir/get";
const ALLOWED = new Set(["games", "teams", "groups", "stadiums"]);

router.get("/worldcup/:endpoint", async (req, res) => {
  const { endpoint } = req.params;

  if (!ALLOWED.has(endpoint)) {
    res.status(404).json({ error: "Not found" });
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
    res.set({
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Access-Control-Allow-Origin": "*",
    });
    res.status(200).send(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: msg });
  }
});

export default router;
