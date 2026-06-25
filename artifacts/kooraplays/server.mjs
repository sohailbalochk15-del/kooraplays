import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "dist/public");
const PORT = Number(process.env.PORT) || 3000;
const WC_BASE = "https://worldcup26.ir/get";
const WC_ALLOWED = new Set(["games", "teams", "groups", "stadiums"]);

const app = express();
app.use(express.json());

// ── World Cup data proxy ──────────────────────────────────────────────────────
app.get("/api/worldcup/:endpoint", async (req, res) => {
  const { endpoint } = req.params;
  if (!WC_ALLOWED.has(endpoint)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const upstream = await fetch(`${WC_BASE}/${endpoint}`, {
      headers: { "User-Agent": "KooraPlays/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`);
    const data = await upstream.text();
    res.set({
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Access-Control-Allow-Origin": "*",
    });
    res.status(200).send(data);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Unknown" });
  }
});

// ── In-memory predictions ─────────────────────────────────────────────────────
const predictVotes = new Map();
function getPredictVotes(matchId) {
  if (!predictVotes.has(matchId)) predictVotes.set(matchId, { home: 0, draw: 0, away: 0, total: 0 });
  return predictVotes.get(matchId);
}

app.get("/api/predictions/:matchId", (req, res) => {
  res.json(getPredictVotes(req.params.matchId));
});
app.post("/api/predictions/:matchId", (req, res) => {
  const { vote } = req.body;
  const valid = ["home", "draw", "away"];
  if (!vote || !valid.includes(vote)) {
    res.status(400).json({ error: "vote must be 'home', 'draw', or 'away'" });
    return;
  }
  const v = getPredictVotes(req.params.matchId);
  v[vote]++;
  v.total++;
  res.json(v);
});

// ── HLS proxy — rewrites ALL segment and playlist URLs through this server ────
function isM3u8(text) {
  return text.trimStart().startsWith("#EXTM3U");
}
function extractM3u8FromHtml(html) {
  const m = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
  return m ? m[0] : null;
}
function rewritePlaylist(text, baseUrl, host) {
  const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);
  const proxyBase = `${host}/api/proxy/hls`;
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
          try {
            const abs = new URL(uri, baseDir).toString();
            return `URI="${proxyBase}?url=${encodeURIComponent(abs)}"`;
          } catch { return _m; }
        });
      }
      try {
        const abs = new URL(trimmed, baseDir).toString();
        return `${proxyBase}?url=${encodeURIComponent(abs)}`;
      } catch { return line; }
    })
    .join("\n");
}

app.get("/api/proxy/hls", async (req, res) => {
  let targetUrl = String(req.query.url ?? "");
  if (!targetUrl.startsWith("http")) {
    res.status(400).json({ error: "Missing or invalid url param" });
    return;
  }

  res.set({ "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" });

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };
  try {
    const origin = new URL(targetUrl).origin;
    headers["Referer"] = origin + "/";
    headers["Origin"] = origin;
  } catch { /* ignore */ }

  try {
    let upstream = await fetch(targetUrl, { headers, signal: AbortSignal.timeout(20_000) });
    const contentType = upstream.headers.get("content-type") ?? "";

    if (contentType.includes("text/html")) {
      const html = await upstream.text();
      const m3u8Url = extractM3u8FromHtml(html);
      if (!m3u8Url) { res.status(502).json({ error: "No m3u8 found in page" }); return; }
      targetUrl = m3u8Url;
      try { const o = new URL(m3u8Url).origin; headers["Referer"] = o + "/"; headers["Origin"] = o; } catch { /* ignore */ }
      upstream = await fetch(m3u8Url, { headers, signal: AbortSignal.timeout(20_000) });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    const text = buf.toString("utf8");

    if (isM3u8(text)) {
      const host = `${req.protocol}://${req.get("host")}`;
      const rewritten = rewritePlaylist(text, targetUrl, host);
      res.set("Content-Type", "application/vnd.apple.mpegurl");
      res.status(upstream.status).send(rewritten);
    } else {
      res.set("Content-Type", upstream.headers.get("content-type") ?? "video/mp2t");
      res.status(upstream.status).send(buf);
    }
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Unknown" });
  }
});

// ── Static frontend + SPA fallback ───────────────────────────────────────────
app.use(express.static(DIST));
app.get("*", (_req, res) => res.sendFile(join(DIST, "index.html")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`KooraPlays production server on port ${PORT}`);
});
