import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

interface Props {
  src: string;
  channelName?: string;
  channelLogo?: string;
}

export function HLSPlayer({ src, channelName, channelLogo }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const hlsRef     = useRef<Hls | null>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(false);
  const [muted,   setMuted]     = useState(false);
  const [fullscr, setFullscr]   = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(false);

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) { setError(true); setLoading(false); }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.onloadedmetadata = () => { setLoading(false); video.play().catch(() => {}); };
      video.onerror = () => { setError(true); setLoading(false); };
    } else {
      setError(true);
      setLoading(false);
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const onFsChange = () => setFullscr(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    if (!wrapRef.current) return;
    if (!document.fullscreenElement) {
      wrapRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full bg-black rounded-xl overflow-hidden group",
        fullscr ? "rounded-none" : ""
      )}
      style={{ aspectRatio: "16/9" }}
    >
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-white/70 text-sm">{t.connectingStream}</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 z-10 p-6 text-center">
          <svg className="w-12 h-12 text-destructive/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-white font-bold">{t.streamUnavailable}</p>
          <p className="text-white/50 text-sm">{t.broadcastEnded}</p>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        muted={muted}
      />

      {!loading && !error && (
        <>
          <div className="kp-watermark text-white/40 font-bold text-xs tracking-widest bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none">
            KooraPlays
          </div>

          {channelName && (
            <div className="absolute top-3 start-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 pointer-events-none">
              {channelLogo && (
                <img src={channelLogo} alt={channelName} className="w-5 h-5 object-contain" />
              )}
              <span className="text-white text-xs font-bold">{channelName}</span>
            </div>
          )}

          <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/20 h-8 w-8"
              title={muted ? t.unmute : t.mute}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 h-8 w-8"
              title={fullscr ? t.exitFullscreen : t.fullscreen}
            >
              {fullscr ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
