import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, CheckCircle2, ChevronUp, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, isSupabaseConfigured, type VoteRecord } from "@/lib/supabase";
import { useLang } from "@/lib/i18n";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const VOTED_KEY = "kooraplays_voted_team";

function safeGetStorage(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSetStorage(key: string, val: string): void {
  try { window.localStorage.setItem(key, val); } catch { /* private mode */ }
}

interface RawTeam {
  id: string;
  name_en: string;
  flag: string;
  groups: string;
  fifa_code: string;
}

interface VoteData {
  votes: Record<string, number>;
  total: number;
}

async function fetchTeams(): Promise<RawTeam[]> {
  const res = await fetch(`${API_BASE}/api/worldcup/teams`);
  if (!res.ok) throw new Error("Failed to fetch teams");
  const data = await res.json();
  return (data.teams ?? []) as RawTeam[];
}

async function fetchVotes(): Promise<VoteData> {
  // Use SECURITY DEFINER RPC to bypass RLS — direct SELECT is blocked for anon
  // on some Supabase configurations (shows 0 votes on desktop browsers).
  const { data, error } = await supabase.rpc("get_team_votes");
  if (error) {
    // Fallback: try direct SELECT in case the RPC doesn't exist yet
    const { data: fallback, error: fallbackErr } = await supabase
      .from("team_votes")
      .select("team_id, vote_count");
    if (fallbackErr) throw new Error(fallbackErr.message);
    const rows = (fallback ?? []) as VoteRecord[];
    const votes: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      votes[row.team_id] = row.vote_count;
      total += row.vote_count;
    }
    return { votes, total };
  }
  const rows = (Array.isArray(data) ? data : []) as VoteRecord[];
  const votes: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    votes[row.team_id] = row.vote_count;
    total += row.vote_count;
  }
  return { votes, total };
}

async function castVote(teamId: string): Promise<{ team_id: string; vote_count: number }> {
  const { data, error } = await supabase.rpc("increment_team_vote", {
    p_team_id: teamId,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return {
    team_id:    String(row?.out_team_id  ?? row?.team_id  ?? teamId),
    vote_count: Number(row?.out_vote_count ?? row?.vote_count ?? 1),
  };
}

export default function VotePage() {
  const qc = useQueryClient();
  const { t, isRtl } = useLang();
  const [votedTeamId, setVotedTeamId] = useState<string | null>(() => safeGetStorage(VOTED_KEY));
  const [justVoted, setJustVoted] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"votes" | "name">("votes");
  const [realtimeOk, setRealtimeOk] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["teams-vote"],
    queryFn: fetchTeams,
    staleTime: 60 * 60 * 1000,
  });

  const { data: voteData, isLoading: loadingVotes } = useQuery({
    queryKey: ["votes-supabase"],
    queryFn: fetchVotes,
    enabled: isSupabaseConfigured,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel("team_votes_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_votes" },
        () => { qc.refetchQueries({ queryKey: ["votes-supabase"] }); }
      )
      .subscribe((status) => {
        setRealtimeOk(status === "SUBSCRIBED");
      });
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const mutation = useMutation({
    mutationFn: castVote,
    onSuccess: (row) => {
      setVoteError(null);
      qc.refetchQueries({ queryKey: ["votes-supabase"] });
      setVotedTeamId(row.team_id);
      setJustVoted(row.team_id);
      safeSetStorage(VOTED_KEY, row.team_id);
      setTimeout(() => setJustVoted(null), 2000);
    },
    onError: (err) => {
      setVoteError(err instanceof Error ? err.message : "Vote failed. Please try again.");
    },
  });

  const handleVote = useCallback((teamId: string) => {
    if (votedTeamId || mutation.isPending) return;
    setVoteError(null);
    mutation.mutate(teamId);
  }, [votedTeamId, mutation]);

  const total = voteData?.total ?? 0;
  const votes = voteData?.votes ?? {};

  const sortedTeams = [...(teams ?? [])].sort((a, b) => {
    if (sortBy === "votes") return (votes[b.id] ?? 0) - (votes[a.id] ?? 0);
    return a.name_en.localeCompare(b.name_en);
  });

  const isLoading = loadingTeams || loadingVotes;

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">FIFA World Cup 2026</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-3">
            {t.voteTitle}{" "}
            <span className="text-primary">{t.voteTitleHighlight}</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            {t.voteSubtitle}
          </p>

          <div className="flex items-center justify-center gap-6 mt-5 flex-wrap gap-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                <span className="font-bold text-foreground text-base">{total.toLocaleString()}</span>{" "}
                {t.voteTotalVotes}
              </span>
            </div>
            {votedTeamId && (
              <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {t.voteYouVoted}
              </div>
            )}
            {isSupabaseConfigured && (
              <div className={cn("flex items-center gap-1 text-xs", realtimeOk ? "text-primary/60" : "text-muted-foreground")}>
                {realtimeOk ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span>{realtimeOk ? t.live : "Polling"}</span>
              </div>
            )}
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              {t.voteNotConfigured} Set <code className="font-mono text-xs bg-black/10 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono text-xs bg-black/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-muted-foreground">
            {(teams ?? []).length} {t.voteTeamsRealtime}
          </p>
          <div className="flex items-center gap-1 rounded-full border border-border overflow-hidden text-xs font-semibold">
            <button
              onClick={() => setSortBy("votes")}
              className={cn("px-3 py-1.5 transition-colors", sortBy === "votes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t.voteByVotes}
            </button>
            <button
              onClick={() => setSortBy("name")}
              className={cn("px-3 py-1.5 transition-colors", sortBy === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t.voteAZ}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {sortedTeams.map((team, idx) => {
                const teamVotes = votes[team.id] ?? 0;
                const pct = total > 0 ? Math.round((teamVotes / total) * 100) : 0;
                const isVoted = votedTeamId === team.id;
                const isJustVoted = justVoted === team.id;
                const canVote = !votedTeamId && !mutation.isPending && isSupabaseConfigured;
                const isTop = sortBy === "votes" && idx === 0 && teamVotes > 0;

                return (
                  <motion.button
                    key={team.id}
                    layout
                    type="button"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    whileHover={canVote ? { scale: 1.02 } : undefined}
                    whileTap={canVote ? { scale: 0.97 } : undefined}
                    onClick={() => handleVote(team.id)}
                    disabled={!canVote}
                    style={{
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                    } as React.CSSProperties}
                    className={cn(
                      "relative w-full text-left rounded-xl border p-4 transition-colors duration-200",
                      isVoted
                        ? "border-primary bg-primary/10 shadow-[0_0_16px_rgba(34,197,94,0.25)]"
                        : isTop
                        ? "border-yellow-500/60 bg-yellow-500/5"
                        : canVote
                        ? "border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                        : "border-border bg-card cursor-default opacity-80"
                    )}
                  >
                    {isTop && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <ChevronUp className="h-3 w-3" /> {t.voteLeading}
                      </span>
                    )}
                    {isVoted && !isTop && (
                      <span className="absolute top-2 right-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </span>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      {team.flag ? (
                        <img
                          src={team.flag}
                          alt={team.name_en}
                          className="w-12 h-8 rounded-sm object-cover border border-border shrink-0 shadow-sm"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-12 h-8 rounded-sm bg-muted flex items-center justify-center border border-border shrink-0">
                          <span className="text-[10px] font-bold text-muted-foreground">{team.fifa_code}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-sm leading-tight truncate">{team.name_en}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {team.groups ? `${t.voteGroupLabel} ${team.groups}` : team.fifa_code}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={cn("font-semibold", isVoted ? "text-primary" : "text-muted-foreground")}>
                          {teamVotes.toLocaleString()} {t.voteTotalVotes}
                        </span>
                        <span className={cn("font-bold tabular-nums", isVoted ? "text-primary" : "text-foreground/70")}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", isVoted ? "bg-primary" : isTop ? "bg-yellow-500" : "bg-primary/40")}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isJustVoted && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm rounded-xl"
                        >
                          <div className="flex items-center gap-2 text-primary font-bold">
                            <CheckCircle2 className="h-5 w-5" />
                            {t.voteCountedMsg}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {voteError && (
          <div className="mt-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
            <p className="text-xs text-destructive font-semibold">
              {voteError.includes("already") ? t.voteAlreadyVoted : `${t.voteErrorMsg}: ${voteError}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t.voteRetryHint}</p>
          </div>
        )}

        {!votedTeamId && !isLoading && !voteError && isSupabaseConfigured && (
          <p className="text-center text-xs text-muted-foreground mt-8">
            {t.voteTapHint}
          </p>
        )}
      </div>
    </div>
  );
}
