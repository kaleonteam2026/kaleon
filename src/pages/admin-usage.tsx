import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import NotFound from "@/pages/not-found";

interface DayPoint { day: string; count: number }
interface RouteRow { route: string; count?: number; count30d?: number; perCallUsd?: number; cost30dUsd?: number }
interface UserRow { userId: string; email: string | null; count: number }
interface UsageResponse {
  today: string;
  caps: { globalAi: number; perUserAi: number; tavily: number };
  today_usage: { globalAi: number; tavily: number; perRoute: RouteRow[] };
  series_30d: { globalAi: DayPoint[]; tavily: DayPoint[] };
  top_users: { today: UserRow[]; last7d: UserRow[] };
  cost_estimate: {
    perCallUsdDefault: number;
    tavilyPerCallUsd: number;
    route30d: RouteRow[];
    total30dUsd: number;
    totalAiCalls30d: number;
    totalTavilyCalls30d: number;
    todayUsd: number;
    avgDailyUsd: number;
    projectedMonthEndUsd: number;
    daysRemainingInMonth: number;
  };
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}
function pct(used: number, cap: number): number {
  if (cap <= 0) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}
function shortDay(d: string): string {
  return d.slice(5); // MM-DD
}

export default function AdminUsage() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<UsageResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    let cancel = false;
    fetch("/api/admin/usage", { credentials: "include" })
      .then(async (r) => {
        if (cancel) return;
        if (r.status === 404) { setStatus("notfound"); return; }
        if (!r.ok) { setStatus("error"); return; }
        const j = (await r.json()) as UsageResponse;
        setData(j);
        setStatus("ok");
      })
      .catch(() => { if (!cancel) setStatus("error"); });
    return () => { cancel = true; };
  }, []);

  if (status === "notfound") return <NotFound />;
  if (status === "error") {
    return (
      <main id="main-content" className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Couldn't load usage</h1>
        <p className="text-sm text-slate-600 mt-2">Please try again in a moment.</p>
        <button
          className="mt-4 text-sm text-indigo-600 underline"
          onClick={() => setLocation("/dashboard")}
        >Back to dashboard</button>
      </main>
    );
  }
  if (status === "loading" || !data) {
    return (
      <main id="main-content" className="max-w-3xl mx-auto p-6">
        <div className="text-sm text-slate-500">Loading usage…</div>
      </main>
    );
  }

  const globalPct = pct(data.today_usage.globalAi, data.caps.globalAi);
  const tavilyPct = pct(data.today_usage.tavily, data.caps.tavily);

  return (
    <main id="main-content" className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">AI usage</h1>
          <p className="text-sm text-slate-500">Owner-only. Snapshot for {data.today} (UTC).</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          ~{fmtUsd(data.cost_estimate.total30dUsd)} estimated last 30d
        </Badge>
      </header>

      {/* Spend summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Spent today (est.)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{fmtUsd(data.cost_estimate.todayUsd)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {data.today_usage.globalAi} AI + {data.today_usage.tavily} Tavily calls so far.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Avg / day (last 30d)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{fmtUsd(data.cost_estimate.avgDailyUsd)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Across {data.cost_estimate.totalAiCalls30d} AI + {data.cost_estimate.totalTavilyCalls30d} Tavily calls.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Projected month-end</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{fmtUsd(data.cost_estimate.projectedMonthEndUsd)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Today + avg-daily &times; {data.cost_estimate.daysRemainingInMonth} days remaining.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Today caps */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Global AI today</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {data.today_usage.globalAi}<span className="text-slate-400 text-base"> / {data.caps.globalAi}</span>
            </div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${globalPct >= 90 ? "bg-rose-500" : globalPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${globalPct}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Per-user AI cap</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{data.caps.perUserAi}<span className="text-slate-400 text-base"> /day</span></div>
            <div className="text-xs text-slate-500 mt-2">Top user today: {data.top_users.today[0]?.count ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tavily today</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {data.today_usage.tavily}<span className="text-slate-400 text-base"> / {data.caps.tavily}</span>
            </div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${tavilyPct >= 90 ? "bg-rose-500" : tavilyPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${tavilyPct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 30-day sparklines */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Global AI — last 30 days ({data.cost_estimate.totalAiCalls30d} calls)</CardTitle>
          </CardHeader>
          <CardContent className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series_30d.globalAi.map((d) => ({ ...d, day: shortDay(d.day) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <RTooltip />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#c7d2fe" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tavily — last 30 days ({data.cost_estimate.totalTavilyCalls30d} searches)</CardTitle>
          </CardHeader>
          <CardContent className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series_30d.tavily.map((d) => ({ ...d, day: shortDay(d.day) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <RTooltip />
                <Area type="monotone" dataKey="count" stroke="#10b981" fill="#a7f3d0" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Per-route breakdown */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Per-route today</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.today_usage.perRoute.length === 0 ? (
              <p className="text-xs text-slate-500">No AI calls yet today.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.today_usage.perRoute} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="route" tick={{ fontSize: 10 }} width={120} />
                  <RTooltip />
                  <Bar dataKey="count" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cost by route — last 30 days (est.)</CardTitle></CardHeader>
          <CardContent>
            {data.cost_estimate.route30d.length === 0 ? (
              <p className="text-xs text-slate-500">No AI calls in the last 30 days.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-slate-500">
                  <tr className="text-left border-b border-slate-200">
                    <th className="py-1.5 font-medium">Route</th>
                    <th className="py-1.5 font-medium text-right">Calls</th>
                    <th className="py-1.5 font-medium text-right">$/call</th>
                    <th className="py-1.5 font-medium text-right">30d cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cost_estimate.route30d.map((r) => (
                    <tr key={r.route} className="border-b border-slate-100">
                      <td className="py-1.5 font-mono">{r.route}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.count30d ?? 0}</td>
                      <td className="py-1.5 text-right tabular-nums text-slate-500">${(r.perCallUsd ?? 0).toFixed(3)}</td>
                      <td className="py-1.5 text-right tabular-nums font-medium">{fmtUsd(r.cost30dUsd ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-[10px] text-slate-400 italic mt-3">
              Static estimates. Tavily searches counted at ${data.cost_estimate.tavilyPerCallUsd.toFixed(3)}/call.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Top users */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top users today</CardTitle></CardHeader>
          <CardContent>
            {data.top_users.today.length === 0 ? (
              <p className="text-xs text-slate-500">No users have generated yet today.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {data.top_users.today.map((u) => (
                  <li key={u.userId} className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5">
                    <span className="truncate">{u.email ?? <span className="font-mono text-slate-500">{u.userId.slice(0, 8)}…</span>}</span>
                    <span className="tabular-nums font-medium">{u.count} / {data.caps.perUserAi}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top users — last 7 days</CardTitle></CardHeader>
          <CardContent>
            {data.top_users.last7d.length === 0 ? (
              <p className="text-xs text-slate-500">No activity in the last 7 days.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {data.top_users.last7d.map((u) => (
                  <li key={u.userId} className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5">
                    <span className="truncate">{u.email ?? <span className="font-mono text-slate-500">{u.userId.slice(0, 8)}…</span>}</span>
                    <span className="tabular-nums font-medium">{u.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
