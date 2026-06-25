import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import type { Connect } from "vite";

const WC_BASE = "https://worldcup26.ir/get";
const WC_ALLOWED = new Set(["games", "teams", "groups", "stadiums"]);

const inMemoryVotes = new Map<string, { home: number; draw: number; away: number; total: number }>();

function getVotes(matchId: string) {
  if (!inMemoryVotes.has(matchId)) {
    inMemoryVotes.set(matchId, { home: 0, draw: 0, away: 0, total: 0 });
  }
  return inMemoryVotes.get(matchId)!;
}

function apiMiddleware(): { name: string; configureServer: (s: import("vite").ViteDevServer) => void } {
  return {
    name: "kooraplays-api",
    configureServer(server) {
      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");

        const wcMatch = url.pathname.match(/^\/api\/worldcup\/([a-z]+)$/);
        if (wcMatch) {
          const endpoint = wcMatch[1];
          if (!WC_ALLOWED.has(endpoint)) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }
          try {
            const upstream = await fetch(`${WC_BASE}/${endpoint}`, {
              headers: { "User-Agent": "KooraPlays/1.0" },
              signal: AbortSignal.timeout(20_000),
            });
            const data = await upstream.text();
            res.writeHead(upstream.ok ? 200 : upstream.status, {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(data);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: msg }));
          }
          return;
        }

        const predMatch = url.pathname.match(/^\/api\/predictions\/(.+)$/);
        if (predMatch) {
          const matchId = decodeURIComponent(predMatch[1]);
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

          if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

          if (req.method === "GET") {
            res.writeHead(200);
            res.end(JSON.stringify(getVotes(matchId)));
            return;
          }

          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            req.on("end", () => {
              try {
                const parsed = JSON.parse(body) as { vote?: string };
                const valid = ["home", "draw", "away"] as const;
                type Vote = typeof valid[number];
                if (!parsed.vote || !valid.includes(parsed.vote as Vote)) {
                  res.writeHead(400);
                  res.end(JSON.stringify({ error: "vote must be 'home', 'draw', or 'away'" }));
                  return;
                }
                const votes = getVotes(matchId);
                votes[parsed.vote as Vote]++;
                votes.total++;
                res.writeHead(200);
                res.end(JSON.stringify(votes));
              } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid body" }));
              }
            });
            return;
          }

          res.writeHead(405);
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        if (url.pathname === "/api/proxy/hls") {
          const raw = url.searchParams.get("url") ?? "";
          if (!raw || !raw.startsWith("http")) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing or invalid url param" }));
            return;
          }
          let target: URL;
          try { target = new URL(raw); } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid url" })); return;
          }
          if (!["http:", "https:"].includes(target.protocol)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Only http/https URLs allowed" })); return;
          }
          // Helper: extract first m3u8 URL from an HTML page (embed player pages)
          function extractM3u8FromHtml(html: string): string | null {
            const match = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
            return match ? match[0] : null;
          }

          try {
            const upstreamHeaders = {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              "Referer": target.origin + "/",
              "Origin": target.origin,
              "Accept": "*/*",
              "Accept-Language": "en-US,en;q=0.9",
            };

            let fetchTarget = target.toString();
            let upstream = await fetch(fetchTarget, { headers: upstreamHeaders, signal: AbortSignal.timeout(20_000) });

            // If the response is HTML, extract the real m3u8 URL and re-fetch it
            const contentTypeHeader = upstream.headers.get("content-type") ?? "";
            if (contentTypeHeader.includes("text/html")) {
              const html = await upstream.text();
              const m3u8Url = extractM3u8FromHtml(html);
              if (m3u8Url) {
                fetchTarget = m3u8Url;
                const m3u8Target = new URL(m3u8Url);
                upstream = await fetch(m3u8Url, {
                  headers: { ...upstreamHeaders, "Referer": m3u8Target.origin + "/", "Origin": m3u8Target.origin },
                  signal: AbortSignal.timeout(20_000),
                });
              } else {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "No m3u8 stream found in player page" }));
                return;
              }
            }

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Cache-Control", "no-cache");

            // Read as buffer so we can inspect magic bytes
            const buf = Buffer.from(await upstream.arrayBuffer());
            const M3U8_MAGIC = Buffer.from("#EXTM3U");

            // Detect HLS by magic bytes — works for URLs without .m3u8 extension
            const isHls = buf.length >= M3U8_MAGIC.length && buf.slice(0, M3U8_MAGIC.length).equals(M3U8_MAGIC);

            if (isHls) {
              // Update target for correct base URL rewriting when we followed HTML→m3u8
              try { target = new URL(fetchTarget); } catch { /* keep original */ }
              // Rewrite ALL non-comment, non-empty lines (segments + child playlists)
              const text = buf.toString("utf8");
              const baseUrl = target.href;
              const baseUrlDir = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);

              const rewritten = text
                .split("\n")
                .map((line) => {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith("#")) {
                    // Rewrite URI="..." inside tags (e.g. #EXT-X-KEY, #EXT-X-MAP)
                    return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
                      try {
                        const abs = new URL(uri, baseUrlDir).toString();
                        return `URI="/api/proxy/hls?url=${encodeURIComponent(abs)}"`;
                      } catch { return _m; }
                    });
                  }
                  // Segment or child playlist URL — make absolute then proxy
                  try {
                    const abs = new URL(trimmed, baseUrlDir).toString();
                    return `/api/proxy/hls?url=${encodeURIComponent(abs)}`;
                  } catch { return line; }
                })
                .join("\n");

              res.writeHead(upstream.status, { "Content-Type": "application/vnd.apple.mpegurl" });
              res.end(rewritten);
            } else {
              const contentType = upstream.headers.get("content-type") ?? "video/mp2t";
              res.writeHead(upstream.status, { "Content-Type": contentType });
              res.end(buf);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: msg }));
          }
          return;
        }

        next();
      };

      server.middlewares.use(handler);
    },
  };
}

const isBuild = process.env.NODE_ENV === "production" || process.argv.includes("build");

const rawPort = process.env.PORT;
if (!isBuild && !rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = rawPort ? Number(rawPort) : 3000;
if (!isBuild && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    apiMiddleware(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
