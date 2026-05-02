const DEFAULT_CAP = 200;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCap(): number {
  const raw = process.env.AI_DAILY_CAP;
  if (!raw) return DEFAULT_CAP;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP;
}

const counter = { day: todayKey(), count: 0 };

export function incrementGlobalAi(): { allowed: boolean; cap: number; used: number } {
  const day = todayKey();
  const cap = getCap();
  if (counter.day !== day) {
    counter.day = day;
    counter.count = 0;
  }
  if (counter.count >= cap) {
    return { allowed: false, cap, used: counter.count };
  }
  counter.count++;
  return { allowed: true, cap, used: counter.count };
}

export function globalCapMessage(cap: number): string {
  return `The app has reached its global daily AI limit (${cap} generations/day). Please try again tomorrow.`;
}
