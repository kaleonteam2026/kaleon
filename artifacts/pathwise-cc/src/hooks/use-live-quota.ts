import { useCallback, useEffect, useRef, useState } from "react";

export interface LiveQuota {
  remainingToday: number;
  cooldownSecondsLeft: number;
  dailyCap: number;
}

export function useLiveQuota() {
  const [quota, setQuota] = useState<LiveQuota | null>(null);
  const tickRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/live/quota", { credentials: "include" });
      if (!r.ok) return;
      const data = (await r.json()) as LiveQuota;
      setQuota(data);
    } catch {
      // best-effort indicator only
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Tick down the cooldown locally so users see a live countdown. A single
  // long-lived interval is enough — it's a no-op when cooldown is already 0.
  useEffect(() => {
    const id = window.setInterval(() => {
      setQuota(q =>
        q && q.cooldownSecondsLeft > 0
          ? { ...q, cooldownSecondsLeft: q.cooldownSecondsLeft - 1 }
          : q,
      );
    }, 1000);
    tickRef.current = id;
    return () => window.clearInterval(id);
  }, []);

  return { quota, refresh };
}
