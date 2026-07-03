import { Router } from "express";

const router = Router();

const teamVotes = new Map<string, number>();
let totalVotes = 0;

router.get("/votes", (_req, res) => {
  const result: Record<string, number> = {};
  teamVotes.forEach((count, teamId) => { result[teamId] = count; });
  res.json({ votes: result, total: totalVotes });
});

router.post("/votes/:teamId", (req, res) => {
  const { teamId } = req.params;
  if (!teamId || typeof teamId !== "string" || teamId.length > 20) {
    res.status(400).json({ error: "Invalid teamId" });
    return;
  }
  const current = teamVotes.get(teamId) ?? 0;
  teamVotes.set(teamId, current + 1);
  totalVotes++;
  res.json({ teamId, votes: current + 1, total: totalVotes });
});

export default router;
