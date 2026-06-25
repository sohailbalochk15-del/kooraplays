export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url");

  if (!raw) {
    return new Response(JSON.stringify({ error: "Missing url query param" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid url" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return new Response(JSON.stringify({ error: "Only http/https URLs allowed" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const upstream = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 KooraPlays/1.0",
        "Referer": url.origin + "/",
        "Origin": url.origin,
      },
      signal: AbortSignal.timeout(20_000),
    });

    // If upstream itself is rate limiting or erroring, pass that through clearly
    // instead of letting the player silently retry-storm.
    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: "Upstream rate limited (429)" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          // tell the player/browser to back off a bit before retrying
          "Retry-After": "3",
        },
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const isM3u8 =
      url.pathname.endsWith(".m3u8") || contentType.includes("mpegurl") || contentType.includes("vnd.apple.mpegurl");

    if (isM3u8) {
      const text = await upstream.text();
      const baseUrl = url.href.substring(0, url.href.lastIndexOf("/") + 1);

      // Rewrite EVERY non-comment, non-blank line (segments .ts/.m4s AND sub-playlists .m3u8),
      // whether they are relative or already absolute. Previously only .m3u8 lines were
      // rewritten, so .ts segment URLs leaked through un-proxied -> 404s and CORS failures.
      const rewritten = text.replace(/^(?!#)(.+)$/gm, (line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        const abs = trimmed.startsWith("http://") || trimmed.startsWith("https://")
          ? trimmed
          : new URL(trimmed, baseUrl).toString();

        return `/api/proxy/hls?url=${encodeURIComponent(abs)}`;
      });

      // Master/variant playlists change rarely-to-never mid-stream; a short cache
      // cuts down on duplicate upstream requests from multiple viewers / player polling,
      // which is the main driver of upstream 429s.
      const cacheControl = url.pathname.includes("master")
        ? "public, max-age=10, s-maxage=10"
        : "public, max-age=2, s-maxage=2, stale-while-revalidate=5";

      return new Response(rewritten, {
        status: upstream.status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": cacheControl,
        },
      });
    }

    // Binary segments (.ts / .m4s / .key etc.) - stream through as-is.
    // These can be cached harder since a given segment's content never changes.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
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