import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { RefreshCw, Lock, Tv, Save, Eye, EyeOff, CheckCircle, AlertCircle, LogOut } from "lucide-react";

const ADMIN_PASSWORD = "koora2026";
const SESSION_KEY    = "kp_admin_authed";

interface ChannelForm {
  id: number | null;
  title: string;
  channel_name: string;
  stream_url: string;
}

const BLANK: ChannelForm = { id: null, title: "", channel_name: "", stream_url: "" };

export default function Admin() {
  const [authed,      setAuthed]      = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [password,    setPassword]    = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [pwError,     setPwError]     = useState(false);

  const [ch1,         setCh1]         = useState<ChannelForm>({ ...BLANK });
  const [ch2,         setCh2]         = useState<ChannelForm>({ ...BLANK });

  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState<1 | 2 | null>(null);
  const [saved,       setSaved]       = useState<1 | 2 | null>(null);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  const login = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPassword("");
  };

  const fetchStreams = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("streams")
      .select("id, title, channel_name, stream_url")
      .order("id", { ascending: true })
      .limit(2);

    if (!error && data) {
      const r1 = data[0];
      const r2 = data[1];
      if (r1) setCh1({ id: r1.id, title: r1.title ?? "", channel_name: r1.channel_name ?? "", stream_url: r1.stream_url ?? "" });
      if (r2) setCh2({ id: r2.id, title: r2.title ?? "", channel_name: r2.channel_name ?? "", stream_url: r2.stream_url ?? "" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) fetchStreams();
  }, [authed, fetchStreams]);

  const saveChannel = async (ch: ChannelForm, num: 1 | 2) => {
    if (!isSupabaseConfigured) { setSaveError("Supabase is not configured."); return; }
    setSaving(num);
    setSaved(null);
    setSaveError(null);

    let error;
    if (ch.id !== null) {
      ({ error } = await supabase
        .from("streams")
        .update({ title: ch.title, channel_name: ch.channel_name, stream_url: ch.stream_url, updated_at: new Date().toISOString() })
        .eq("id", ch.id));
    } else {
      ({ error } = await supabase
        .from("streams")
        .insert({ title: ch.title, channel_name: ch.channel_name, stream_url: ch.stream_url }));
    }

    setSaving(null);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(num);
      setTimeout(() => setSaved(null), 2500);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-xs text-muted-foreground text-center">Enter the admin password to manage stream URLs</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPwError(false); }}
                  onKeyDown={e => e.key === "Enter" && login()}
                  placeholder="Password"
                  className={`w-full bg-background border rounded-xl px-4 py-3 pr-11 text-sm text-foreground
                    placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all
                    ${pwError
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-border focus:ring-primary/30 focus:border-primary/60"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {pwError && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Incorrect password. Try again.
                </p>
              )}

              <button
                onClick={login}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3 text-sm font-semibold transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2.5">
              <Tv className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Stream Admin</h1>
              <p className="text-xs text-muted-foreground">Manage live stream URLs for Channel 1 &amp; 2</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        {/* Global error */}
        {saveError && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-500">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Supabase is not configured. Set <code className="bg-yellow-500/10 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-yellow-500/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to enable editing.</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-primary/60" />
          </div>
        ) : (
          <>
            <ChannelCard
              num={1}
              form={ch1}
              onChange={setCh1}
              onSave={() => saveChannel(ch1, 1)}
              saving={saving === 1}
              saved={saved === 1}
            />
            <ChannelCard
              num={2}
              form={ch2}
              onChange={setCh2}
              onSave={() => saveChannel(ch2, 2)}
              saving={saving === 2}
              saved={saved === 2}
            />
          </>
        )}

        <p className="text-center text-xs text-muted-foreground/50 pb-4">
          Changes are saved to Supabase instantly and reflected in the live player within seconds.
        </p>
      </div>
    </div>
  );
}

interface ChannelCardProps {
  num: 1 | 2;
  form: ChannelForm;
  onChange: (v: ChannelForm) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

function ChannelCard({ num, form, onChange, onSave, saving, saved }: ChannelCardProps) {
  const set = (key: keyof ChannelForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [key]: e.target.value });

  const hint = form.stream_url
    ? form.stream_url.toLowerCase().includes(".m3u8")
      ? "HLS · will use built-in Hls.js player"
      : "Embed · will load in an iframe"
    : "Paste a stream URL or embed URL above";

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {num}
          </span>
          <span className="text-sm font-semibold text-foreground">Channel {num}</span>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>

      {/* Fields */}
      <div className="p-5 space-y-4">
        {/* Stream URL — most important, show first & largest */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Stream URL <span className="text-destructive">*</span>
          </label>
          <textarea
            value={form.stream_url}
            onChange={set("stream_url")}
            placeholder="https://cdn.example.com/live/stream.m3u8 or https://yoursite.com/embed?channel=1"
            rows={3}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground
              placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30
              focus:border-primary/60 transition-all resize-none font-mono"
          />
          <p className="text-[11px] text-muted-foreground/60">{hint}</p>
        </div>

        {/* Title & Channel name — side by side on wide screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Display Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. FIFA World Cup 2026"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground
                placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30
                focus:border-primary/60 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Channel Name
            </label>
            <input
              type="text"
              value={form.channel_name}
              onChange={set("channel_name")}
              placeholder="e.g. KooraPlays"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground
                placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30
                focus:border-primary/60 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="px-5 pb-5">
        <button
          onClick={onSave}
          disabled={saving || !form.stream_url.trim()}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
            text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ml-auto"
        >
          {saving
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
            : <><Save className="h-4 w-4" /> Save Channel {num}</>
          }
        </button>
      </div>
    </div>
  );
}
