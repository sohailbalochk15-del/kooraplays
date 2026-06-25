import { useState, useEffect, useRef, useCallback } from "react";

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
import { Users, RefreshCw, Tv, Volume2, VolumeX, Maximize, Minimize2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LiveDot } from "@/components/LiveDot";
import { PredictCard } from "@/components/PredictCard";
import { supabase, type StreamConfig } from "@/lib/supabase";
import { useMatches } from "@/hooks/useMatches";
import Hls from "hls.js";
import { useLang } from "@/lib/i18n";

const VAST_TAG =
  "https://windy-imagination.com/dBm-F.zHdkGjNCvuZHGLUc/Sevms9kugZ/U/lhkoP/TTcpxcNCjNAj5/NDzOc/tJNgzTER2gM/D/kM4/MLSTZRsla/Wa1/p/d/Du0NxA";

type Lang = "en" | "ar";

interface ChannelData {
  stream_url: string;
  title: string;
  channel_name: string;
  channel_logo: string | null;
}

const DEFAULT: ChannelData = {
  stream_url: "",
  title: "FIFA World Cup 2026",
  channel_name: "KooraPlays",
  channel_logo: null,
};

function isHlsUrl(url: string)     { return url.includes(".m3u8"); }
function isYouTubeUrl(url: string) { return url.includes("youtube.com") || url.includes("youtu.be"); }
function toProxyUrl(url: string)   { return `/api/proxy/hls?url=${encodeURIComponent(url)}`; }

const isIOS = typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(navigator as Navigator & { MSStream?: unknown }).MSStream;

type PlayerState = "idle" | "ad" | "stream" | "error";

interface HlsPlayerProps { src: string; title: string; }

function HlsPlayer({ src, title }: HlsPlayerProps) {
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
  const [muted,        setMuted]        = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const proxied = toProxyUrl(src);

  const startStream = useCallback(() => {
    setState("stream");
    const video = videoRef.current;
    if (!video) return;
    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true, lowLatencyMode: true,
        backBufferLength: 30, maxBufferLength: 20, maxMaxBufferLength: 30,
        fragLoadingTimeOut: 20000, manifestLoadingTimeOut: 15000, levelLoadingTimeOut: 15000,
      });
      hlsRef.current = hls;
      hls.loadSource(proxied);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = false;
        video.play().catch(() => { video.muted = true; setMuted(true); video.play().catch(() => {}); });
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR)     hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR)  hls.recoverMediaError();
        else setState("error");
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => { video.play().catch(() => {}); }, { once: true });
      video.addEventListener("error", () => setState("error"), { once: true });
    } else {
      setState("error");
    }
  }, [proxied, src]);

  useEffect(() => {
    const video = videoRef.current;
    const adEl  = adContainerRef.current;
    if (!video || !adEl || !window.google?.ima) return;
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
      adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => { imaReadyRef.current = false; });
      const req = new ima.AdsRequest();
      req.adTagUrl = VAST_TAG;
      const w = adEl.offsetWidth  || containerRef.current?.offsetWidth  || window.innerWidth;
      const h = adEl.offsetHeight || containerRef.current?.offsetHeight || window.innerHeight;
      req.linearAdSlotWidth = w; req.linearAdSlotHeight = h;
      req.nonLinearAdSlotWidth = w; req.nonLinearAdSlotHeight = 150;
      adsLoader.requestAds(req);
    } catch { /* silent */ }
    return () => {
      adsManagerRef.current?.destroy(); adsLoaderRef.current?.destroy();
      adDisplayRef.current?.destroy(); hlsRef.current?.destroy();
      hlsRef.current = null; imaReadyRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const handlePlay = useCallback(() => {
    const adEl = adContainerRef.current;
    const mgr  = adsManagerRef.current;
    const disp = adDisplayRef.current;
    const ima  = window.google?.ima;
    if (ima && disp && mgr && imaReadyRef.current) {
      try {
        disp.initialize();
        const onAdsDone = () => { setState("stream"); mgr.destroy(); startStream(); };
        mgr.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdsDone);
        mgr.addEventListener(ima.AdEvent.Type.SKIPPED, onAdsDone);
        mgr.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => { setState("stream"); startStream(); });
        const w = adEl?.offsetWidth  || containerRef.current?.offsetWidth  || window.innerWidth;
        const h = adEl?.offsetHeight || containerRef.current?.offsetHeight || window.innerHeight;
        mgr.init(w, h, ima.ViewMode.NORMAL);
        setState("ad");
        mgr.start();
        return;
      } catch { /* fall through */ }
    }
    startStream();
  }, [startStream]);

  useEffect(() => {
    const unlockOrientation = () => { try { screen.orientation.unlock(); } catch { /* unsupported */ } };
    const onFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const active = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(active); if (!active) unlockOrientation();
    };
    const onWebkitFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setIsFullscreen(!!doc.webkitFullscreenElement);
    };
    const video = videoRef.current;
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onWebkitFsChange);
    video?.addEventListener("webkitbeginfullscreen", () => setIsFullscreen(true));
    video?.addEventListener("webkitendfullscreen", () => { setIsFullscreen(false); unlockOrientation(); });
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onWebkitFsChange);
    };
  }, []);

  const toggleMute = () => { if (videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted); } };

  const toggleFullscreen = () => {
    const video = videoRef.current; const container = containerRef.current;
    if (isFullscreen) {
      const doc = document as Document & { webkitExitFullscreen?: () => void };
      if (document.exitFullscreen) document.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      try { screen.orientation.unlock(); } catch {}; return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lockLandscape = () => { try { (screen.orientation as any).lock?.("landscape")?.catch(() => {}); } catch {} };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vid = video as any; const el = (container ?? video) as any;
    if (vid?.webkitEnterFullscreen) { vid.webkitEnterFullscreen(); lockLandscape(); return; }
    if (el?.requestFullscreen) el.requestFullscreen().then(lockLandscape).catch(() => {});
    else if (el?.webkitRequestFullscreen) { el.webkitRequestFullscreen(); lockLandscape(); }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black group">
      <div ref={adContainerRef} className="absolute inset-0 z-30"
           style={{ pointerEvents: state === "ad" ? "auto" : "none",
                    visibility: state === "ad" ? "visible" : "hidden",
                    opacity: state === "ad" ? 1 : 0 }} />

      {state === "idle" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <button onClick={handlePlay}
            className="flex items-center justify-center w-20 h-20 rounded-full
                       bg-primary hover:bg-primary/90 active:scale-95 transition-all
                       shadow-2xl shadow-primary/40 touch-manipulation"
            aria-label="Play stream">
            <Play className="h-9 w-9 text-white fill-white ml-1" />
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center">
          <div className="rounded-full bg-destructive/20 p-4">
            <Tv className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-sm font-semibold text-destructive mb-1">{t.streamUnavailable}</p>
          <p className="text-xs text-muted-foreground">{t.broadcastEnded}</p>
        </div>
      )}

      <video ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        title={title} playsInline muted={muted}
        controls={isIOS && state === "stream"} data-testid="video-hls" />

      {state === "stream" && (
        <div className="absolute bottom-0 inset-x-0 z-20
                        bg-gradient-to-t from-black/80 via-black/40 to-transparent
                        opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-between px-4 py-3 md:py-4">
            <button onClick={toggleMute}
              className="flex items-center gap-2 rounded-full bg-black/60 active:bg-black/90
                         px-4 py-2.5 md:p-2.5 hover:bg-black/80 transition-colors active:scale-95 touch-manipulation"
              title={muted ? t.unmute : t.mute}>
              {muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
              <span className="text-white text-xs font-semibold md:hidden">{muted ? t.unmute : t.mute}</span>
            </button>
            {!isIOS && (
              <button onClick={toggleFullscreen}
                className="flex items-center gap-2 rounded-full bg-black/60 active:bg-black/90
                           px-4 py-2.5 md:p-2.5 hover:bg-black/80 transition-colors active:scale-95 touch-manipulation"
                title={isFullscreen ? t.exitFullscreen : t.fullscreen}>
                {isFullscreen ? <Minimize2 className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
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

export default function Live() {
  const { t } = useLang();
  const { data: matches } = useMatches();
  const liveMatch = (matches ?? []).find((m) => m.status === "LIVE") ?? null;

  const [activeLang,  setActiveLang]  = useState<Lang>("en");
  const [channels,    setChannels]    = useState<Record<Lang, ChannelData>>({ en: DEFAULT, ar: DEFAULT });
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [viewers,     setViewers]     = useState(Math.floor(Math.random() * 40000) + 5000);

  function applyRow(cfg: StreamConfig, prev: Record<Lang, ChannelData>): Record<Lang, ChannelData> {
    const lang: Lang = (cfg.language === "ar") ? "ar" : "en";
    return {
      ...prev,
      [lang]: {
        stream_url:   cfg.stream_url   ?? prev[lang].stream_url,
        title:        cfg.title        ?? prev[lang].title,
        channel_name: cfg.channel_name ?? prev[lang].channel_name,
        channel_logo: cfg.channel_logo ?? null,
      },
    };
  }

  useEffect(() => {
    async function fetchStreams() {
      setLoadingMeta(true);
      const { data, error } = await supabase
        .from("streams")
        .select("*")
        .order("id", { ascending: true })
        .limit(2);

      if (!error && data && data.length > 0) {
        let merged: Record<Lang, ChannelData> = { en: DEFAULT, ar: DEFAULT };
        data.forEach((row) => { merged = applyRow(row as StreamConfig, merged); });

        if (data.length >= 2 && !data.some((r) => r.language)) {
          const [r0, r1] = data as StreamConfig[];
          merged = {
            en: { stream_url: r0.stream_url, title: r0.title, channel_name: r0.channel_name ?? "KooraPlays", channel_logo: r0.channel_logo ?? null },
            ar: { stream_url: r1.stream_url, title: r1.title, channel_name: r1.channel_name ?? "كووراPlays", channel_logo: r1.channel_logo ?? null },
          };
        }

        setChannels(merged);
      }
      setLoadingMeta(false);
    }

    fetchStreams();

    const realtimeChannel = supabase
      .channel("streams_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "streams" }, (payload) => {
        const updated = payload.new as StreamConfig;
        setChannels((prev) => applyRow(updated, prev));
      })
      .subscribe();

    return () => { supabase.removeChannel(realtimeChannel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setViewers((p) => Math.max(5000, p + Math.floor(Math.random() * 200) - 80));
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  const active = channels[activeLang];
  const { stream_url, title, channel_name, channel_logo } = active;

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] bg-black">
      <div className="flex-none flex items-center justify-between gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-background border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="destructive" className="shrink-0 px-2 py-0.5 flex items-center gap-1.5 text-[11px] font-bold">
            <LiveDot className="h-1.5 w-1.5" /> {t.live}
          </Badge>
          <div className="flex items-center gap-1.5 min-w-0">
            {channel_logo ? (
              <img src={channel_logo} alt={channel_name}
                   className="h-6 w-6 rounded-full object-cover shrink-0 border border-border" />
            ) : (
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Tv className="h-3 w-3 text-primary" />
              </div>
            )}
            <div className="min-w-0 leading-none">
              <p className="text-[10px] text-muted-foreground truncate">{channel_name}</p>
              <p className="text-sm md:text-base font-bold truncate" data-testid="text-stream-title">{title}</p>
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

      <div className="flex-1 min-h-0 relative bg-black">
        {loadingMeta ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !stream_url ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-full bg-primary/10 p-5">
              <Tv className="h-10 w-10 text-primary" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{t.noStream}</p>
            <p className="text-xs text-muted-foreground/60">{t.noStreamDesc}</p>
          </div>
        ) : isHlsUrl(stream_url) ? (
          <HlsPlayer key={`${activeLang}-${stream_url}`} src={stream_url} title={title} />
        ) : isYouTubeUrl(stream_url) ? (
          <div className="absolute inset-0">
            <iframe key={`${activeLang}-${stream_url}`}
              className="absolute inset-0 w-full h-full"
              src={stream_url} title={title} frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
              data-testid="iframe-stream" />
          </div>
        ) : (
          <div className="absolute inset-0">
            <iframe key={`${activeLang}-${stream_url}`}
              className="absolute inset-0 w-full h-full"
              src={stream_url} title={title} frameBorder="0"
              allowFullScreen data-testid="iframe-stream-generic" />
          </div>
        )}
      </div>

      {liveMatch && (
        <div className="flex-none bg-background border-t border-border/40">
          <div className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              {liveMatch.home_flag ? (
                <img src={liveMatch.home_flag} alt={liveMatch.home_team}
                     className="w-8 h-6 rounded-sm object-cover border border-border shrink-0" />
              ) : (
                <div className="w-8 h-6 rounded-sm bg-muted flex items-center justify-center border border-border shrink-0">
                  <span className="text-[9px] font-bold text-muted-foreground">{liveMatch.home_team.substring(0,3).toUpperCase()}</span>
                </div>
              )}
              <span className="font-bold text-sm truncate">{liveMatch.home_team}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="destructive" className="animate-pulse flex gap-1 items-center px-1.5 py-0.5 text-[10px]">
                <LiveDot className="h-1.5 w-1.5" /> LIVE
              </Badge>
              <span className="text-2xl font-black tracking-tighter tabular-nums">
                <span className={(liveMatch.home_score ?? 0) > (liveMatch.away_score ?? 0) ? "text-primary" : ""}>
                  {liveMatch.home_score ?? 0}
                </span>
                <span className="text-muted-foreground mx-1.5 font-normal text-lg">-</span>
                <span className={(liveMatch.away_score ?? 0) > (liveMatch.home_score ?? 0) ? "text-primary" : ""}>
                  {liveMatch.away_score ?? 0}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span className="font-bold text-sm truncate">{liveMatch.away_team}</span>
              {liveMatch.away_flag ? (
                <img src={liveMatch.away_flag} alt={liveMatch.away_team}
                     className="w-8 h-6 rounded-sm object-cover border border-border shrink-0" />
              ) : (
                <div className="w-8 h-6 rounded-sm bg-muted flex items-center justify-center border border-border shrink-0">
                  <span className="text-[9px] font-bold text-muted-foreground">{liveMatch.away_team.substring(0,3).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          <PredictCard
            matchId={liveMatch.id}
            homeTeam={liveMatch.home_team}
            awayTeam={liveMatch.away_team}
          />
        </div>
      )}

      <div className="flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-background border-t border-border/40">
        <span className="text-[11px] text-muted-foreground font-medium mr-1">Commentary:</span>
        <div className="flex items-center rounded-full border border-border overflow-hidden text-xs font-bold">
          <button
            onClick={() => setActiveLang("en")}
            className={`px-4 py-1.5 transition-colors ${
              activeLang === "en"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setActiveLang("ar")}
            className={`px-4 py-1.5 transition-colors ${
              activeLang === "ar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            &#x639;&#x631;&#x628;&#x64A;
          </button>
        </div>
      </div>
    </div>
  );
}
