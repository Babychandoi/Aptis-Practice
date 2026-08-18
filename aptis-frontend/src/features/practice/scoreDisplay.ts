export function formatScoreLine(
  awardedScore: number | null | undefined,
  maxScore: number | null | undefined,
) {
  if (awardedScore == null || maxScore == null) {
    return null;
  }
  return `${awardedScore.toFixed(1)}/${maxScore.toFixed(1)}`;
}
