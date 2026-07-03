import { useState, useEffect, useRef } from "react";

export type PredictVote = "home" | "draw" | "away";

export interface VoteCounts {
  home: number;
  draw: number;
  away: number;
  total: number;
}

function storageKey(matchId: string) { return `kp_vote_${matchId}`; }
function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string): void {
  try { window.localStorage.setItem(key, val); } catch { /* private mode */ }
}

export function usePredictions(matchId: string) {
  const [counts, setCounts] = useState<VoteCounts>({ home: 0, draw: 0, away: 0, total: 0 });
  const [myVote, setMyVote] = useState<PredictVote | null>(null);
  const [voting,  setVoting]  = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMyVote((safeGet(storageKey(matchId)) as PredictVote) ?? null);
  }, [matchId]);

  async function fetchCounts() {
    try {
      const res = await fetch(`/api/predictions/${encodeURIComponent(matchId)}`);
      if (res.ok) setCounts(await res.json());
    } catch { /* ignore network errors */ }
  }

  useEffect(() => {
    fetchCounts();
    pollRef.current = setInterval(fetchCounts, 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function castVote(vote: PredictVote) {
    if (myVote || voting) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/predictions/${encodeURIComponent(matchId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (res.ok) {
        const updated: VoteCounts = await res.json();
        setCounts(updated);
        safeSet(storageKey(matchId), vote);
        setMyVote(vote);
      }
    } catch { /* ignore */ }
    setVoting(false);
  }

  function pct(n: number) {
    return counts.total === 0 ? 33 : Math.round((n / counts.total) * 100);
  }

  return { counts, myVote, voting, castVote, pct };
}
