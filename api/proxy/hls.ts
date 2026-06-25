export const config = { runtime: "edge" };

const M3U8_MAGIC = "#EXTM3U";

function isM3u8(text: string): boolean {
  return text.trimStart().startsWith(M3U8_MAGIC);
}

function extractM3u8FromHtml(html: string): string | null {
  const match = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
  return match ? match[0] : null;
}

function rewritePlaylist(text: string, fetchUrl: string): string {
  const baseDir = fetchUrl.substring(0, fetchUrl.lastIndexOf("/") + 1);
  const proxyBase = "/api/proxy/hls";

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

      // Rewrite every segment / child-playlist line (relative or absolute)
      const abs =
        trimmed.startsWith("http://") || trimmed.startsWith("https://")
          ? trimmed
          : (() => { try { return new URL(trimmed, baseDir).toString(); } catch { return trimmed; } })();

      return `${proxyBase}?url=${encodeURIComponent(abs)}`;
    })
    .join("\n");
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams, host, protocol } = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" },
    });
  }

  const raw = searchParams.get("url");
  if (!raw) {
    return new Response(JSON.stringify({ error: "Missing url query param" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  let targetUrl: string;
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error("Bad protocol");
    targetUrl = u.toString();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid url param" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const cors = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" };

  function makeHeaders(url: string): Record<string, string> {
    let origin = "";
    try { origin = new URL(url).origin; } catch { /* ignore */ }
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      ...(origin ? { Referer: origin + "/", Origin: origin } : {}),
    };
  }

  try {
    let fetchUrl = targetUrl;
    let upstream = await fetch(fetchUrl, {
      headers: makeHeaders(fetchUrl),
      signal: AbortSignal.timeout(20_000),
    });

    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: "Upstream rate limited (429)" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Retry-After": "3" },
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "";

    // If the URL returns an HTML embed page, extract the real m3u8 URL from it
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
      upstream = await fetch(fetchUrl, {
        headers: makeHeaders(fetchUrl),
        signal: AbortSignal.timeout(20_000),
      });
    }

    const isM3u8Url =
      fetchUrl.includes(".m3u8") ||
      (upstream.headers.get("content-type") ?? "").includes("mpegurl");

    if (isM3u8Url) {
      const text = await upstream.text();
      if (!isM3u8(text)) {
        // Unexpected — pass through as-is
        return new Response(text, {
          status: upstream.status,
          headers: { "Content-Type": upstream.headers.get("content-type") ?? "text/plain", ...cors },
        });
      }
      const rewritten = rewritePlaylist(text, fetchUrl);

      const cacheControl = fetchUrl.includes("master")
        ? "public, max-age=10, s-maxage=10"
        : "public, max-age=2, s-maxage=2, stale-while-revalidate=5";

      return new Response(rewritten, {
        status: upstream.status,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": cacheControl,
        },
      });
    }

    // Binary segments (.ts / .m4s / .key etc.) — stream through directly
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
