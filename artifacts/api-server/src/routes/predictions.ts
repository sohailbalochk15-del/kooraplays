import { Router } from "express";

const router = Router();

const votes = new Map<string, { home: number; draw: number; away: number; total: number }>();

function getVotes(matchId: string) {
  if (!votes.has(matchId)) {
    votes.set(matchId, { home: 0, draw: 0, away: 0, total: 0 });
  }
  return votes.get(matchId)!;
}

router.get("/predictions/:matchId", (req, res) => {
  const { matchId } = req.params;
  res.json(getVotes(matchId));
});

router.post("/predictions/:matchId", (req, res) => {
  const { matchId } = req.params;
  const { vote } = req.body as { vote?: string };
  const valid = ["home", "draw", "away"] as const;
  type Vote = typeof valid[number];

  if (!vote || !valid.includes(vote as Vote)) {
    res.status(400).json({ error: "vote must be 'home', 'draw', or 'away'" });
    return;
  }

  const v = getVotes(matchId);
  v[vote as Vote]++;
  v.total++;
  res.json(v);
});

export default router;
