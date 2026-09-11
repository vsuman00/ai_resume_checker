export type ScoreBand = "needs_work" | "good_start" | "strong";

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return "strong";
  if (score >= 50) return "good_start";
  return "needs_work";
}
