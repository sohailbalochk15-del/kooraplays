/**
 * Live.tsx — KooraPlays live streaming page
 *
 * Architecture overview:
 * ─────────────────────
 * Both HlsPlayer components are ALWAYS mounted in the DOM.
 * Only CSS visibility (z-index + opacity) changes when switching channels.
 * This avoids destroying/recreating Chrome's MediaSource — which is the root
 * cause of both channels showing the same stream in Chromium browsers.
 *
 * Each channel owns:
 *   • Its own <video> element
 *   • Its own Hls instance
 *   • Completely independent buffer / ABR state
 *
 * When switching:   active channel → visible; inactive → hidden + paused
 * On cleanup:       hls.detachMedia() → hls.destroy() → video.src='' → video.load()
 *                   (the load() call is the critical Chrome MSE release step)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import { Users, RefreshCw, Tv, Volume2, VolumeX, Maximize, Minimize2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LiveDot } from "@/components/LiveDot";
import { PredictCard } from "@/components/PredictCard";
import { supabase, type StreamConfig } from "@/lib/supabase";
import { useMatches } from "@/hooks/useMatches";
import { useLang } from "@/lib/i18n";
import { useSearch } from "wouter";

// ─── IMA SDK types (optional ad support) ───────────────────────────────────
declare global {
  interface Window { google?: { ima?: ImaNamespace }; }
}
interface ImaNamespace {
  AdDisplayContainer: new (container: HTMLElement, video?: HTMLVideoElement) => { initialize(): void; destroy(): void };
  AdsLoader: new (container: { initialize(): void; destroy(): void }) => {
    addEventListener(type: string, handler: (e: unknown) => void): void;
    requestAds(req: unknown): void;
    destroy(): void;
  };
  AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: string } };
  AdErrorEvent: { Type: { AD_ERROR: string } };
  AdEvent: { Type: { ALL_ADS_COMPLETED: string; SKIPPED: string } };
  AdsRequest: new () => {
    adTagUrl: string;
    linearAdSlotWidth: number; linearAdSlotHeight: number;
    nonLinearAdSlotWidth: number; nonLinearAdSlotHeight: number;
  };
  ViewMode: { NORMAL: string };
  AdsManager: {
    addEventListener(type: string, handler: () => void): void;
    init(w: number, h: number, mode: string): void;
    start(): void;
    destroy(): void;
  };
  AdsManagerLoadedEvent_instance: { getAdsManager(video: HTMLVideoElement): ImaNamespace["AdsManager"] };
}

// ─── Constants ──────────────────────────────────────────────────────────────
const VAST_TAG = ""; // Set to your VAST tag URL to enable pre-roll ads

// ─── Types ──────────────────────────────────────────────────────────────────
type PlayerState = "idle" | "ad" | "stream" | "error";
type ActiveChannel = 1 | 2;

interface ChannelData {
  stream_url: string;
  title: string;
  channel_name: string;
  channel_logo: string | null;
}

// Default placeholder shown while Supabase data loads
const DEFAULT_CHANNEL: ChannelData = {
  stream_url: "",
  title: "FIFA World Cup 2026",
  channel_name: "KooraPlays",
  channel_logo: null,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Proxy every stream URL through our API to:
 *  1. Add CORS headers
 *  2. Rewrite relative .m3u8 segment URLs back through the proxy
 * This works for URLs with or without the .m3u8 extension —
 * the proxy detects HLS content via the #EXTM3U magic bytes.
 */
function toProxyUrl(url: string): string {
  return `/api/proxy/hls?url=${encodeURIComponent(url)}`;
}

/**
 * Detect iOS/iPadOS (uses native HLS via <video src> instead of hls.js)
 * Must be done at module level — never changes during a session.
 */
const isIOS =
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(navigator as Navigator & { MSStream?: unknown }).MSStream;

// ─── HlsPlayer ──────────────────────────────────────────────────────────────

interface HlsPlayerProps {
  /** The raw stream URL (proxied internally). Can be any URL — hls.js detects format. */
  src: string;
  /** Channel label shown in aria/title attributes */
  title: string;
  /** Whether this player is the active (visible) channel */
  visible: boolean;
}

/**
 * HlsPlayer — a self-contained HLS video player component.
 *
 * Key design decisions:
 * • Never unmounts when switching channels (visible prop controls CSS only).
 * • Creates a fresh Hls instance each time `src` changes (URL update from Supabase).
 * • Fully cleans up on unmount: detachMedia → destroy → video.src='' → video.load()
 *   The video.load() call is mandatory for Chrome to release its MediaSource object.
 */
function HlsPlayer({ src, title, visible }: HlsPlayerProps) {
  const videoRef       = useRef<HTMLVideoElement>(null);
  const hlsRef         = useRef<Hls | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adsLoaderRef   = useRef<InstanceType<ImaNamespace["AdsLoader"]> | null>(null);
  const adsManagerRef  = useRef<ImaNamespace["AdsManager"] | null>(null);
  const adDisplayRef   = useRef<InstanceType<ImaNamespace["AdDisplayContainer"]> | null>(null);
  const imaReadyRef    = useRef(false);

  const { t } = useLang();

  const [state,        setState]        = useState<PlayerState>("idle");
  const [muted,        setMuted]        = useState<boolean>(() => {
    try { return localStorage.getItem("kp_muted") === "1"; } catch { return false; }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Proxied URL — the proxy handles CORS and rewrites segment URLs
  const proxied = toProxyUrl(src);

  // Keep a ref to muted so startStream always reads the latest value without
  // needing to be in its dependency array (avoids stale closure issues).
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  /**
   * Fully tears down the current HLS session.
   * Order matters for Chrome: detachMedia before destroy, then reset <video>.
   */
  const destroyHls = useCallback(() => {
    const video = videoRef.current;
    if (hlsRef.current) {
      hlsRef.current.detachMedia(); // detach first — releases MSE SourceBuffer
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (video) {
      video.pause();
      video.removeAttribute("src"); // clear src attribute
      video.load();                 // ← Chrome: this releases the MediaSource object
    }
  }, []);

  /**
   * Initialise a new HLS session and start loading the stream.
   * Called from the play button and after ad completion.
   */
  const startStream = useCallback(() => {
    // Guard: never try to load an empty URL — proxy would 400 → fatal HLS error
    if (!src) return;
    setState("stream");
    const video = videoRef.current;
    if (!video) return;

    // Always destroy any existing session before creating a new one
    destroyHls();

    if (Hls.isSupported()) {
      // ── Create a new Hls instance with tuned buffer settings ──
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,

        // Buffer: enough to survive brief CDN hiccups without over-buffering
        backBufferLength: 30,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        maxBufferSize: 30 * 1000 * 1000, // 30 MB cap
        maxBufferHole: 0.5,              // auto-fill gaps ≤ 0.5 s

        // Live sync: stay ~3 segments behind live edge
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveBackBufferLength: 0,

        // Quality: auto-select level capped to player display size
        startLevel: -1,
        capLevelToPlayerSize: true,
        abrEwmaDefaultEstimate: 1_000_000, // start ABR estimate at 1 Mbps

        // Stall recovery
        nudgeMaxRetry: 5,
        nudgeOffset: 0.2,
        highBufferWatchdogPeriod: 2,
        maxStarvationDelay: 4,
        maxLoadingDelay: 4,

        // Timeouts — generous for proxied streams
        fragLoadingTimeOut: 20_000,
        fragLoadingMaxRetry: 4,
        fragLoadingRetryDelay: 1_000,
        fragLoadingMaxRetryTimeout: 8_000,
        manifestLoadingTimeOut: 15_000,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 1_000,
        levelLoadingTimeOut: 15_000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1_000,
      });

      hlsRef.current = hls;

      // Attach to the video element BEFORE loading the source
      hls.attachMedia(video);
      hls.loadSource(proxied);

      // Auto-play once manifest is parsed.
      // Respect the user's saved mute preference; fall back to muted if
      // the browser blocks unmuted autoplay (e.g. on first-ever visit).
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = mutedRef.current;
        video.play().catch(() => {
          // Autoplay policy blocked — retry muted
          video.muted = true;
          setMuted(true);
          try { localStorage.setItem("kp_muted", "1"); } catch { /* private mode */ }
          video.play().catch(() => {});
        });
      });

      // ── Error recovery with retry limits ──
      let networkRetries = 0;
      let mediaRetries   = 0;
      const MAX_RETRIES  = 3;

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) {
          // Non-fatal buffer stall — nudge the playhead forward slightly
          if (
            data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
            data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL
          ) {
            video.currentTime += 0.1;
          }
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (networkRetries < MAX_RETRIES) {
            networkRetries++;
            // Exponential back-off: 1 s, 2 s, 3 s …
            setTimeout(() => { hls.startLoad(); }, Math.min(1000 * networkRetries, 5000));
          } else {
            setState("error");
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (mediaRetries < MAX_RETRIES) {
            mediaRetries++;
            if (mediaRetries === 1) {
              hls.recoverMediaError(); // first attempt: standard recovery
            } else {
              hls.swapAudioCodec();   // second attempt: swap codec strategy
              hls.recoverMediaError();
            }
          } else {
            setState("error");
          }
        } else {
          setState("error");
        }
      });

      // Reset retry counters on a successful fragment load
      hls.on(Hls.Events.FRAG_LOADED, () => {
        networkRetries = 0;
        mediaRetries   = 0;
      });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // ── Native HLS fallback (Safari / iOS) ──
      // Safari has built-in HLS support; set src directly
      video.src = proxied;
      video.addEventListener("loadedmetadata", () => { video.play().catch(() => {}); }, { once: true });
      video.addEventListener("error",          () => setState("error"),              { once: true });
    } else {
      // Neither hls.js nor native HLS available
      setState("error");
    }
  }, [proxied, destroyHls]);

  // ── When src changes (Supabase update), reset player to idle ──
  useEffect(() => {
    if (src) {
      // Tear down old session; user must press Play again for new URL
      destroyHls();
      setState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // ── When this player becomes invisible, pause to save bandwidth ──
  // When it becomes visible again, resume if already in "stream" state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!visible) {
      video.pause();
    } else {
      // Only resume if we were already streaming (don't auto-play on first show)
      if (state === "stream") {
        video.play().catch(() => {});
      }
    }
  }, [visible, state]);

  // ── Optional: Google IMA pre-roll ad support ──
  useEffect(() => {
    const video = videoRef.current;
    const adEl  = adContainerRef.current;
    if (!video || !adEl || !window.google?.ima || !VAST_TAG) return;
    const ima = window.google.ima;
    try {
      const adDisplay = new ima.AdDisplayContainer(adEl, video);
      adDisplayRef.current = adDisplay;
      const adsLoader = new ima.AdsLoader(adDisplay);
      adsLoaderRef.current = adsLoader;
      adsLoader.addEventListener(
        ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (event: { getAdsManager(v: HTMLVideoElement): ImaNamespace["AdsManager"] }) => {
          adsManagerRef.current = event.getAdsManager(video);
          imaReadyRef.current = true;
        }
      );
      adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => {
        imaReadyRef.current = false;
      });
      const req = new ima.AdsRequest();
      req.adTagUrl = VAST_TAG;
      const w = adEl.offsetWidth  || containerRef.current?.offsetWidth  || window.innerWidth;
      const h = adEl.offsetHeight || containerRef.current?.offsetHeight || window.innerHeight;
      req.linearAdSlotWidth     = w; req.linearAdSlotHeight     = h;
      req.nonLinearAdSlotWidth  = w; req.nonLinearAdSlotHeight  = 150;
      adsLoader.requestAds(req);
    } catch { /* IMA load failed silently */ }

    return () => {
      // Full IMA + HLS teardown on unmount
      adsManagerRef.current?.destroy();
      adsLoaderRef.current?.destroy();
      adDisplayRef.current?.destroy();
      imaReadyRef.current = false;
      destroyHls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Play button handler: try ad first, fall through to stream ──
  const handlePlay = useCallback(() => {
    const adEl = adContainerRef.current;
    const mgr  = adsManagerRef.current;
    const disp = adDisplayRef.current;
    const ima  = window.google?.ima;

    if (ima && disp && mgr && imaReadyRef.current) {
      try {
        disp.initialize();
        const onAdsDone = () => { setState("stream"); mgr.destroy(); startStream(); };
        mgr.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED,    onAdsDone);
        mgr.addEventListener(ima.AdEvent.Type.SKIPPED,              onAdsDone);
        mgr.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => { setState("stream"); startStream(); });
        const w = adEl?.offsetWidth  || containerRef.current?.offsetWidth  || window.innerWidth;
        const h = adEl?.offsetHeight || containerRef.current?.offsetHeight || window.innerHeight;
        mgr.init(w, h, ima.ViewMode.NORMAL);
        setState("ad");
        mgr.start();
        return;
      } catch { /* fall through to stream */ }
    }
    startStream();
  }, [startStream]);

  // ── Fullscreen change listeners ──
  useEffect(() => {
    const unlockOrientation = () => { try { screen.orientation.unlock(); } catch { /* unsupported */ } };
    const onFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const active = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(active);
      if (!active) unlockOrientation();
    };
    const onWebkitBegin = () => setIsFullscreen(true);
    const onWebkitEnd   = () => { setIsFullscreen(false); unlockOrientation(); };
    const video = videoRef.current;
    document.addEventListener("fullscreenchange",        onFsChange);
    document.addEventListener("webkitfullscreenchange",  onFsChange);
    video?.addEventListener("webkitbeginfullscreen",     onWebkitBegin);
    video?.addEventListener("webkitendfullscreen",       onWebkitEnd);
    return () => {
      document.removeEventListener("fullscreenchange",       onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      video?.removeEventListener("webkitbeginfullscreen",    onWebkitBegin);
      video?.removeEventListener("webkitendfullscreen",      onWebkitEnd);
    };
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      const next = !muted;
      videoRef.current.muted = next;
      setMuted(next);
      try { localStorage.setItem("kp_muted", next ? "1" : "0"); } catch { /* private mode */ }
    }
  };

  const toggleFullscreen = () => {
    const video     = videoRef.current;
    const container = containerRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lockLandscape = () => { try { (screen.orientation as any).lock?.("landscape")?.catch(() => {}); } catch {} };
    if (isFullscreen) {
      const doc = document as Document & { webkitExitFullscreen?: () => void };
      if (document.exitFullscreen)      document.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      try { screen.orientation.unlock(); } catch {}
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vid = video as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el  = (container ?? video) as any;
    if (vid?.webkitEnterFullscreen) { vid.webkitEnterFullscreen(); lockLandscape(); return; }
    if (el?.requestFullscreen)      el.requestFullscreen().then(lockLandscape).catch(() => {});
    else if (el?.webkitRequestFullscreen) { el.webkitRequestFullscreen(); lockLandscape(); }
  };

  return (
    /*
     * Both channel players sit at absolute inset-0.
     * The visible channel is z-10 (on top); the hidden one is z-0 (behind).
     * Using z-index + pointer-events instead of display:none keeps the video
     * element alive in the DOM so its HLS instance stays connected.
     */
    <div
      ref={containerRef}
      className="absolute inset-0 bg-black group"
      style={{
        zIndex:        visible ? 10 : 0,
        pointerEvents: visible ? "auto" : "none",
        visibility:    visible ? "visible" : "hidden",
      }}
    >
      {/* IMA ad container — sits above video, below UI controls */}
      <div
        ref={adContainerRef}
        className="absolute inset-0 z-30"
        style={{
          pointerEvents: state === "ad" ? "auto"    : "none",
          visibility:    state === "ad" ? "visible" : "hidden",
          opacity:       state === "ad" ? 1         : 0,
        }}
      />

      {/* Play button overlay — shown in idle state only when a stream URL is available */}
      {state === "idle" && src && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <button
            onClick={handlePlay}
            className="flex items-center justify-center w-20 h-20 rounded-full
                       bg-primary hover:bg-primary/90 active:scale-95 transition-all
                       shadow-2xl shadow-primary/40 touch-manipulation"
            aria-label="Play stream"
          >
            <Play className="h-9 w-9 text-white fill-white ml-1" />
          </button>
        </div>
      )}

      {/* Loading spinner — shown in idle state while stream URL has not loaded yet */}
      {state === "idle" && !src && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <RefreshCw className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center">
          <div className="rounded-full bg-destructive/20 p-4">
            <Tv className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-sm font-semibold text-destructive mb-1">{t.streamUnavailable}</p>
          <p className="text-xs text-muted-foreground">{t.broadcastEnded}</p>
          {/* Retry button */}
          <button
            onClick={() => { setState("idle"); }}
            className="mt-2 flex items-center gap-2 rounded-full bg-primary/20 px-4 py-2
                       text-xs font-semibold text-primary hover:bg-primary/30 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t.retry ?? "Retry"}
          </button>
        </div>
      )}

      {/* The video element — hls.js attaches its MediaSource here */}
      {/* NOTE: muted is controlled via videoRef.current.muted directly to avoid
          React's muted-attribute reconciliation conflicting with our autoplay logic. */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        title={title}
        playsInline
        // Show native controls on iOS (hls.js uses native; native controls required)
        controls={isIOS && state === "stream"}
        data-testid="video-hls"
      />

      {/* Bottom control bar — mute / fullscreen */}
      {state === "stream" && (
        <div className="absolute bottom-0 inset-x-0 z-20
                        bg-gradient-to-t from-black/80 via-black/40 to-transparent
                        opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-between px-4 py-3 md:py-4">
            <button
              onClick={toggleMute}
              className="flex items-center gap-2 rounded-full bg-black/60 active:bg-black/90
                         px-4 py-2.5 md:p-2.5 hover:bg-black/80 transition-colors active:scale-95 touch-manipulation"
              title={muted ? t.unmute : t.mute}
            >
              {muted
                ? <VolumeX className="h-5 w-5 text-white" />
                : <Volume2 className="h-5 w-5 text-white" />}
              <span className="text-white text-xs font-semibold md:hidden">
                {muted ? t.unmute : t.mute}
              </span>
            </button>

            {!isIOS && (
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 rounded-full bg-black/60 active:bg-black/90
                           px-4 py-2.5 md:p-2.5 hover:bg-black/80 transition-colors active:scale-95 touch-manipulation"
                title={isFullscreen ? t.exitFullscreen : t.fullscreen}
              >
                {isFullscreen
                  ? <Minimize2 className="h-5 w-5 text-white" />
                  : <Maximize  className="h-5 w-5 text-white" />}
                <span className="text-white text-xs font-semibold md:hidden">
                  {isFullscreen ? t.exitFullscreen : t.fullscreen}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live page ───────────────────────────────────────────────────────────────

export default function Live() {
  const { t } = useLang();
  const { data: matches } = useMatches();

  // Collect all live matches in order — Channel 1 shows index 0, Channel 2 shows index 1
  const liveMatches = (matches ?? []).filter((m) => m.status === "LIVE" || m.status === "HALFTIME");

  // Read ?m=1 or ?m=2 from the URL (set by MatchCard "Watch Now" buttons)
  // so clicking "Watch Now" on Match 2 opens Channel 2 directly
  const search = useSearch();
  const mParam = new URLSearchParams(search).get("m");

  // Active channel: 1 or 2 — initialised from URL param if present
  const [activeChannel, setActiveChannel] = useState<ActiveChannel>(
    mParam === "2" ? 2 : 1
  );

  // Channel data fetched from Supabase streams table
  // Index 0 = Channel 1, Index 1 = Channel 2
  const [channels, setChannels] = useState<[ChannelData, ChannelData]>([
    { ...DEFAULT_CHANNEL },
    { ...DEFAULT_CHANNEL, title: "FIFA World Cup 2026" },
  ]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Simulated viewer count — increments/decrements randomly every 10 s
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 40000) + 5000);

  // ── Map a StreamConfig row to a ChannelData object ──
  function rowToChannel(row: StreamConfig): ChannelData {
    return {
      stream_url:   row.stream_url   ?? "",
      title:        row.title        ?? DEFAULT_CHANNEL.title,
      channel_name: row.channel_name ?? "KooraPlays",
      channel_logo: row.channel_logo ?? null,
    };
  }

  // ── Fetch channel configs from Supabase on mount ──
  useEffect(() => {
    async function fetchStreams() {
      setLoadingMeta(true);
      const { data, error } = await supabase
        .from("streams")
        .select("*")
        .order("id", { ascending: true }) // Channel 1 = first row, Channel 2 = second row
        .limit(2);

      if (!error && data && data.length > 0) {
        const rows = data as StreamConfig[];

        setChannels([
          // Channel 1 — first database row
          rows[0] ? rowToChannel(rows[0]) : { ...DEFAULT_CHANNEL },
          // Channel 2 — second database row (fall back to DEFAULT if only one row)
          rows[1] ? rowToChannel(rows[1]) : { ...DEFAULT_CHANNEL },
        ]);
      }
      setLoadingMeta(false);
    }

    fetchStreams();

    // ── Real-time Supabase subscription — updates channel data without page reload ──
    const realtimeChannel = supabase
      .channel("streams_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "streams" },
        async () => {
          // Re-fetch both rows when any stream row changes
          // (simpler than trying to map individual payload.new to channel index)
          const { data: fresh } = await supabase
            .from("streams")
            .select("*")
            .order("id", { ascending: true })
            .limit(2);

          if (fresh && fresh.length > 0) {
            const rows = fresh as StreamConfig[];
            setChannels([
              rows[0] ? rowToChannel(rows[0]) : { ...DEFAULT_CHANNEL },
              rows[1] ? rowToChannel(rows[1]) : { ...DEFAULT_CHANNEL },
            ]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(realtimeChannel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Simulated viewer ticker ──
  useEffect(() => {
    const timer = setInterval(() => {
      setViewers((p) => Math.max(5000, p + Math.floor(Math.random() * 200) - 80));
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  // Active channel metadata (for the header bar)
  const { title, channel_name, channel_logo } = channels[activeChannel - 1];

  return (
    <div className="flex flex-col h-live-page bg-black">

      {/* ── Top bar: channel info + viewer count ── */}
      <div className="flex-none flex items-center justify-between gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-background border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant="destructive"
            className="shrink-0 px-2 py-0.5 flex items-center gap-1.5 text-[11px] font-bold"
          >
            <LiveDot className="h-1.5 w-1.5" /> {t.live}
          </Badge>
          <div className="flex items-center gap-1.5 min-w-0">
            {channel_logo ? (
              <img
                src={channel_logo}
                alt={channel_name}
                className="h-6 w-6 rounded-full object-cover shrink-0 border border-border"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Tv className="h-3 w-3 text-primary" />
              </div>
            )}
            <div className="min-w-0 leading-none">
              <p className="text-[10px] text-muted-foreground truncate">{channel_name}</p>
              <p
                className="text-sm md:text-base font-bold truncate"
                data-testid="text-stream-title"
              >
                {title}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
          <Users className="h-3.5 w-3.5" />
          <span className="text-xs font-medium" data-testid="text-viewer-count">
            {viewers.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Video area — both HLS players always mounted ── */}
      <div className="flex-1 min-h-0 relative bg-black">
        {loadingMeta ? (
          /* Loading spinner while Supabase data is being fetched */
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/*
             * Channel 1 player — always mounted; visible when activeChannel === 1
             * Uses a stable key so it never remounts on channel switch.
             * The key only changes when the src URL itself changes (Supabase update),
             * which resets the player to idle state for the new URL.
             */}
            <HlsPlayer
              key={`ch1-${channels[0].stream_url}`}
              src={channels[0].stream_url}
              title={channels[0].title}
              visible={activeChannel === 1}
            />

            {/*
             * Channel 2 player — always mounted; visible when activeChannel === 2
             * Completely independent Hls instance and <video> element.
             * Chrome's MediaSource for each channel is fully isolated.
             */}
            <HlsPlayer
              key={`ch2-${channels[1].stream_url}`}
              src={channels[1].stream_url}
              title={channels[1].title}
              visible={activeChannel === 2}
            />

            {/* Fallback: no stream URL configured for active channel */}
            {!channels[activeChannel - 1].stream_url && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="rounded-full bg-primary/10 p-5">
                  <Tv className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">{t.noStream}</p>
                <p className="text-xs text-muted-foreground/60">{t.noStreamDesc}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Live match score bar ──
           Shows the match that corresponds to the active channel:
           Channel 1 → liveMatches[0], Channel 2 → liveMatches[1]
           Falls back to liveMatches[0] if only one live match exists. */}
      {(() => {
        const m = liveMatches[activeChannel - 1] ?? liveMatches[0] ?? null;
        if (!m) return null;
        return (
          <div className="flex-none bg-background border-t border-border/40">
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex items-center gap-2 min-w-0">
                {m.home_flag ? (
                  <img
                    src={m.home_flag}
                    alt={m.home_team}
                    className="w-8 h-6 rounded-sm object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-8 h-6 rounded-sm bg-muted flex items-center justify-center border border-border shrink-0">
                    <span className="text-[9px] font-bold text-muted-foreground">
                      {m.home_team.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="font-bold text-sm truncate">{m.home_team}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={m.status === "HALFTIME" ? "outline" : "destructive"}
                  className={`animate-pulse flex gap-1 items-center px-1.5 py-0.5 text-[10px] ${
                    m.status === "HALFTIME"
                      ? "border-yellow-500/40 text-yellow-500 bg-yellow-500/10"
                      : ""
                  }`}
                >
                  <LiveDot className="h-1.5 w-1.5" />
                  {m.status === "HALFTIME" ? "HT" : t.live}
                </Badge>
                <span className="text-2xl font-black tracking-tighter tabular-nums">
                  <span className={(m.home_score ?? 0) > (m.away_score ?? 0) ? "text-primary" : ""}>
                    {m.home_score ?? 0}
                  </span>
                  <span className="text-muted-foreground mx-1.5 font-normal text-lg">-</span>
                  <span className={(m.away_score ?? 0) > (m.home_score ?? 0) ? "text-primary" : ""}>
                    {m.away_score ?? 0}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 min-w-0 justify-end">
                <span className="font-bold text-sm truncate">{m.away_team}</span>
                {m.away_flag ? (
                  <img
                    src={m.away_flag}
                    alt={m.away_team}
                    className="w-8 h-6 rounded-sm object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-8 h-6 rounded-sm bg-muted flex items-center justify-center border border-border shrink-0">
                    <span className="text-[9px] font-bold text-muted-foreground">
                      {m.away_team.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <PredictCard
              matchId={m.id}
              homeTeam={m.home_team}
              awayTeam={m.away_team}
            />
          </div>
        );
      })()}

      {/* ── Channel switcher tabs ── */}
      <div className="flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-background border-t border-border/40">
        <div className="flex items-center rounded-full border border-border overflow-hidden text-xs font-bold">
          {/* Channel 1 button */}
          <button
            onClick={() => setActiveChannel(1)}
            className={`px-5 py-1.5 transition-colors ${
              activeChannel === 1
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={activeChannel === 1}
          >
            Channel 1
          </button>

          {/* Channel 2 button */}
          <button
            onClick={() => setActiveChannel(2)}
            className={`px-5 py-1.5 transition-colors ${
              activeChannel === 2
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={activeChannel === 2}
          >
            Channel 2
          </button>
        </div>
      </div>

    </div>
  );
}
