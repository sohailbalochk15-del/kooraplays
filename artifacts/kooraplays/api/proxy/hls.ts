import type { IncomingMessage, ServerResponse } from "node:http";

const M3U8_MAGIC = Buffer.from("#EXTM3U");

function isM3u8(buf: Buffer): boolean {
  return buf.length >= M3U8_MAGIC.length && buf.subarray(0, M3U8_MAGIC.length).equals(M3U8_MAGIC);
}

function extractM3u8FromHtml(html: string): string | null {
  const match = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
  return match ? match[0] : null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-cache");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `https://${(req as any).headers.host}`);
  let targetUrl = url.searchParams.get("url") ?? "";

  if (!targetUrl.startsWith("http")) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing or invalid url param" }));
    return;
  }

  const upstreamHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    const targetOrigin = new URL(targetUrl).origin;
    upstreamHeaders["Referer"] = targetOrigin + "/";
    upstreamHeaders["Origin"] = targetOrigin;
  } catch { /* ignore bad URL */ }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    let upstream = await fetch(targetUrl, { headers: upstreamHeaders, signal: ctrl.signal });
    clearTimeout(timer);

    const contentType = upstream.headers.get("content-type") ?? "";

    if (contentType.includes("text/html")) {
      const html = await upstream.text();
      const m3u8Url = extractM3u8FromHtml(html);
      if (!m3u8Url) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No m3u8 stream found in player page" }));
        return;
      }
      targetUrl = m3u8Url;
      try {
        const m3u8Origin = new URL(m3u8Url).origin;
        upstreamHeaders["Referer"] = m3u8Origin + "/";
        upstreamHeaders["Origin"] = m3u8Origin;
      } catch { /* ignore */ }
      const ctrl2 = new AbortController();
      const timer2 = setTimeout(() => ctrl2.abort(), 20_000);
      upstream = await fetch(m3u8Url, { headers: upstreamHeaders, signal: ctrl2.signal });
      clearTimeout(timer2);
    }

    const buf = Buffer.from(await upstream.arrayBuffer());

    if (isM3u8(buf)) {
      const text = buf.toString("utf8");
      const baseUrl = targetUrl;
      const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);

      const rewritten = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          if (trimmed.startsWith("#")) {
            return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
              try {
                const abs = new URL(uri, baseDir).toString();
                return `URI="/api/proxy/hls?url=${encodeURIComponent(abs)}"`;
              } catch { return _m; }
            });
          }

          try {
            const abs = new URL(trimmed, baseDir).toString();
            return `/api/proxy/hls?url=${encodeURIComponent(abs)}`;
          } catch { return line; }
        })
        .join("\n");

      res.writeHead(upstream.status, { "Content-Type": "application/vnd.apple.mpegurl" });
      res.end(rewritten);
    } else {
      const ct = upstream.headers.get("content-type") ?? "video/mp2t";
      res.writeHead(upstream.status, { "Content-Type": ct });
      res.end(buf);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: msg }));
    }
  }
}
