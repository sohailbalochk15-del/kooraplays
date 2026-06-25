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

        next();
      };

      server.middlewares.use(handler);
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

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
