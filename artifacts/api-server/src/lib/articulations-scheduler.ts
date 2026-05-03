// Scheduled refresh of ASSIST.org articulation agreements.
//
// Wakes ~1 minute after boot and then once every 24 hours, calling the same
// refresh routine the operator-run script uses. Per-(CC, UC/CSU, major)
// articulation rows are upserted into the `articulations` table, and any
// stale `seo_pages` rows are timestamped backwards so the very next request
// rerenders the article with the freshly pulled table.
//
// At least once per ASSIST.org admit cycle is the bar; running daily means
// updates land within hours of being published.
import { logger } from "./logger";
import { runArticulationsRefresh } from "../services/articulationsRefresh";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let started = false;

export function startArticulationsScheduler(): void {
  if (started) return;
  if (process.env.NODE_ENV === "test") return;
  started = true;

  const tick = () => {
    runArticulationsRefresh()
      .then((s) => logger.info({ ...s }, "articulations refresh tick complete"))
      .catch((err) => logger.error({ err }, "articulations refresh tick threw"));
  };

  // Stagger 60s after boot so we don't compete with cold-start work, then
  // run every 24h. The job is idempotent — re-running is cheap.
  setTimeout(tick, 60_000);
  setInterval(tick, ONE_DAY_MS);
  logger.info("Articulations scheduler started (24h tick)");
}
