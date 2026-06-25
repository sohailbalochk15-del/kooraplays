export const config = { runtime: "edge" };

const M3U8_MAGIC = "#EXTM3U";

function isM3u8(text: string): boolean {
  return text.trimStart().startsWith(M3U8_MAGIC);
}

function extractM3u8FromHtml(html: string): string | null {
  const match = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
  return match ? match[0] : null;
}

function rewritePlaylist(text: string, baseUrl: string, proxyBase: string): string {
  const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Rewrite URI="..." attributes inside tags (e.g. #EXT-X-KEY, #EXT-X-MAP)
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
          try {
            const abs = new URL(uri, baseDir).toString();
            return `URI="${proxyBase}?url=${encodeURIComponent(abs)}"`;
          } catch {
            return _m;
          }
        });
      }

      // Rewrite every segment / child-playlist line
      try {
        const abs = new URL(trimmed, baseDir).toString();
        return `${proxyBase}?url=${encodeURIComponent(abs)}`;
      } catch {
        return line;
      }
    })
    .join("\n");
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // CORS pre-flight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  const targetUrl = url.searchParams.get("url") ?? "";
  if (!targetUrl.startsWith("http")) {
    return new Response(JSON.stringify({ error: "Missing or invalid url param" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const upstreamHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };
  try {
    const origin = new URL(targetUrl).origin;
    upstreamHeaders["Referer"] = origin + "/";
    upstreamHeaders["Origin"] = origin;
  } catch { /* ignore */ }

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  };

  // The proxy base path used when rewriting m3u8 URLs back through this function
  const proxyBase = `${url.protocol}//${url.host}/api/proxy/hls`;

  try {
    let fetchUrl = targetUrl;
    let upstream = await fetch(fetchUrl, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(20_000),
    });

    const contentType = upstream.headers.get("content-type") ?? "";

    // If the URL returns an HTML embed page, extract the real m3u8 and re-fetch
    if (contentType.includes("text/html")) {
      const html = await upstream.text();
      const m3u8Url = extractM3u8FromHtml(html);
      if (!m3u8Url) {
        return new Response(JSON.stringify({ error: "No m3u8 stream found in player page" }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }
      fetchUrl = m3u8Url;
      try {
        const o = new URL(m3u8Url).origin;
        upstreamHeaders["Referer"] = o + "/";
        upstreamHeaders["Origin"] = o;
      } catch { /* ignore */ }
      upstream = await fetch(m3u8Url, {
        headers: upstreamHeaders,
        signal: AbortSignal.timeout(20_000),
      });
    }

    const body = await upstream.text();

    if (isM3u8(body)) {
      const rewritten = rewritePlaylist(body, fetchUrl, proxyBase);
      return new Response(rewritten, {
        status: upstream.status,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          ...cors,
        },
      });
    }

    // Binary segment — stream it through as-is
    const binary = await fetch(fetchUrl, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(20_000),
    });
    const buf = await binary.arrayBuffer();
    const ct = binary.headers.get("content-type") ?? "video/mp2t";
    return new Response(buf, {
      status: binary.status,
      headers: { "Content-Type": ct, ...cors },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
}
