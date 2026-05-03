// Manual / cron-invokable wrapper around the shared refresh routine. Runs
// once and exits.
//
// Usage:
//   pnpm --filter @workspace/api-server run refresh:articulations
//
// Set ASSIST_LIVE_FETCH=1 to enable best-effort live ASSIST.org pulls (the
// endpoint is rate-limited and may be blocked by their CDN; failures fall
// back to the bundled seed agreements). The api server also runs this same
// routine in-process every 24 hours via startArticulationsScheduler().
import { runArticulationsRefresh } from "../services/articulationsRefresh";

async function main() {
  console.log("Refreshing articulations across the full CC × UC/CSU × major grid…");
  const s = await runArticulationsRefresh();
  console.log(
    `Done. upserts=${s.upserts} live=${s.liveHits} seed=${s.seedHits} pages_invalidated=${s.invalidated} skipped_no_data=${s.skipped}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("refresh-articulations failed", err);
  process.exit(1);
});
