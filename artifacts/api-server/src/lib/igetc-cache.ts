export const igetcAnalysisCache = new Map<number, { data: unknown; cachedAt: number }>();
export const IGETC_ANALYSIS_TTL = 60 * 60 * 1000; // 1 hour

export function invalidateIgetcAnalysis(profileId: number): void {
  igetcAnalysisCache.delete(profileId);
}
