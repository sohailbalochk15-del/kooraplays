import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const M3U8_MAGIC = Buffer.from("#EXTM3U");

function isM3u8(buf: Buffer): boolean {
  if (buf.length < M3U8_MAGIC.length) return false;
  return buf.slice(0, M3U8_MAGIC.length).equals(M3U8_MAGIC);
}

const FORWARDED_HEADERS = [
  "accept",
  "accept-language",
  "accept-encoding",
  "origin",
  "referer",
  "user-agent",
  "cookie",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "cache-control",
  "pragma",
];

interface CacheEntry {
  data: Buffer;
  contentType: string;
  isPlaylist: boolean;
  rewritten: string;
  expiresAt: number;
}

const m3u8Cache = new Map<string, CacheEntry>();
const M3U8_TTL_MS = 2_000;

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of m3u8Cache) {
    if (entry.expiresAt < now) m3u8Cache.delete(key);
  }
}

setInterval(pruneCache, 10_000);

router.get("/proxy/hls", async (req: Request, res: Response) => {
  let url = String(req.query.url ?? "");

  if (!url.startsWith("http")) {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  let targetHostname = "";
  const targetOrigin = (() => {
    try {
      const u = new URL(url);
      targetHostname = u.hostname;
      return u.origin;
    } catch { return ""; }
  })();

  const isTwitch = targetHostname.includes("ttvnw.net") || targetHostname.includes("twitch.tv");

  const upstreamHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
  };

  for (const header of FORWARDED_HEADERS) {
    const val = req.headers[header];
    if (val && typeof val === "string") {
      upstreamHeaders[header] = val;
    }
  }

  if (!upstreamHeaders["referer"] && targetOrigin) {
    upstreamHeaders["Referer"] = isTwitch ? "https://www.twitch.tv/" : targetOrigin + "/";
  }
  if (!upstreamHeaders["origin"] && targetOrigin) {
    upstreamHeaders["Origin"] = isTwitch ? "https://www.twitch.tv" : targetOrigin;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");

  const cached = m3u8Cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    res.status(200);
    res.setHeader("Content-Type", cached.isPlaylist ? "application/vnd.apple.mpegurl" : cached.contentType);
    res.send(cached.isPlaylist ? cached.rewritten : cached.data);
    return;
  }

  /** Extract first m3u8 URL embedded in an HTML embed player page */
  function extractM3u8FromHtml(html: string): string | null {
    const match = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
    return match ? match[0] : null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let upstream = await fetch(url, {
      headers: upstreamHeaders,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const contentType = upstream.headers.get("content-type") ?? "";

    // If the URL returns an HTML page (embed player), extract the real m3u8 URL and re-fetch it
    if (contentType.includes("text/html")) {
      const html = await upstream.text();
      const m3u8Url = extractM3u8FromHtml(html);
      if (!m3u8Url) {
        res.status(502).json({ error: "No m3u8 stream found in player page" });
        return;
      }
      // Re-fetch the actual m3u8 URL
      url = m3u8Url;
      const m3u8Target = new URL(m3u8Url);
      upstreamHeaders["Referer"] = m3u8Target.origin + "/";
      upstreamHeaders["Origin"]  = m3u8Target.origin;
      const ctrl2 = new AbortController();
      const timer2 = setTimeout(() => ctrl2.abort(), 15_000);
      upstream = await fetch(m3u8Url, { headers: upstreamHeaders, signal: ctrl2.signal });
      clearTimeout(timer2);
    }

    res.status(upstream.status);

    const buffer = Buffer.from(await upstream.arrayBuffer());

    if (isM3u8(buffer)) {
      const body = buffer.toString("utf8");
      const baseUrl = new URL(url);

      const rewritten = body
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();

          if (!trimmed) return line;

          if (trimmed.startsWith("#")) {
            return line.replace(/URI="([^"]+)"/, (_match, uri: string) => {
              try {
                const absolute = new URL(uri, baseUrl).toString();
                return `URI="/api/proxy/hls?url=${encodeURIComponent(absolute)}"`;
              } catch {
                return _match;
              }
            });
          }

          try {
            const absolute = new URL(trimmed, baseUrl).toString();
            return `/api/proxy/hls?url=${encodeURIComponent(absolute)}`;
          } catch {
            return line;
          }
        })
        .join("\n");

      if (upstream.ok) {
        m3u8Cache.set(url, {
          data: buffer,
          contentType,
          isPlaylist: true,
          rewritten,
          expiresAt: Date.now() + M3U8_TTL_MS,
        });
      }

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.send(rewritten);
    } else {
      res.setHeader("Content-Type", contentType || "video/mp2t");
      res.send(buffer);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    res.status(502).json({ error: msg });
  }
});

export default router;
