import { Router } from "express";

const router = Router();

router.get("/proxy/hls", async (req, res) => {
  const raw = req.query.url as string | undefined;

  if (!raw) {
    res.status(400).json({ error: "Missing url query param" });
    return;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    res.status(400).json({ error: "Only http/https URLs allowed" });
    return;
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

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";

    res.set({
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    });

    const isM3u8 = url.pathname.endsWith(".m3u8") || contentType.includes("mpegurl");

    if (isM3u8) {
      const text = await upstream.text();
      const baseUrl = url.href.substring(0, url.href.lastIndexOf("/") + 1);

      const rewritten = text.replace(/^(?!#)(.+\.m3u8.*)$/gm, (line) => {
        if (line.startsWith("http://") || line.startsWith("https://")) return line;
        const abs = new URL(line.trim(), baseUrl).toString();
        return `/api/proxy/hls?url=${encodeURIComponent(abs)}`;
      });
      res.status(upstream.status).send(rewritten);
    } else {
      const buf = await upstream.arrayBuffer();
      res.status(upstream.status).send(Buffer.from(buf));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: msg });
  }
});

export default router;
