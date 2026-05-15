export interface ScoreWeights {
  technical_weight: number;
  communication_weight: number;
  skillset_weight: number;
  oral_weight: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  technical_weight: 0.40,
  communication_weight: 0.20,
  skillset_weight: 0.25,
  oral_weight: 0.15,
};

export function calculateWeightedScore(
  technical: number,
  communication: number,
  skillset: number,
  oral: number,
  weights: ScoreWeights
): number {
  return (
    technical * weights.technical_weight +
    communication * weights.communication_weight +
    skillset * weights.skillset_weight +
    oral * weights.oral_weight
  );
}

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-destructive';
}

export function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-success/10';
  if (score >= 40) return 'bg-warning/10';
  return 'bg-destructive/10';
}
