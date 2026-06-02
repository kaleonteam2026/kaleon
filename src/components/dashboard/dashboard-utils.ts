export function readinessAccent(score: number) {
  if (score >= 60) return { stroke: "#4ECCA3", labelKey: "pages.progress.onTrack", color: "#4ECCA3" };
  if (score >= 40) return { stroke: "#f59e0b", labelKey: "pages.progress.needsFocus", color: "#f59e0b" };
  return { stroke: "#ef4444", labelKey: "pages.progress.atRisk", color: "#ef4444" };
}

import type { TFunction } from "@/lib/copy";

export function estimatedTransferTerm(totalUnits: number, t: TFunction): string {
  const remaining = Math.max(0, 60 - totalUnits);
  const semestersLeft = Math.ceil(remaining / 15);
  const now = new Date();
  const monthsAhead = semestersLeft * 5;
  const target = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  const month = target.getMonth();
  const seasonKey = month >= 6 && month <= 11 ? "common.season_fall" : month >= 0 && month <= 4 ? "common.season_spring" : "common.season_summer";
  return `${t(seasonKey)} ${target.getFullYear()}`;
}
