import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";
import NotFound from "@/pages/not-found";

interface DayPoint { day: string; count: number }
interface SlugRow { slug: string; name: string; count: number }
interface ComboRow {
  fromSlug: string;
  toSlug: string;
  majorSlug: string;
  ccName: string;
  schoolName: string;
  majorName: string;
  count: number;
  path: string;
}

interface SeoResponse {
  range: { from: string; to: string; days: number };
  totals: {
    clicks: number;
    uniqueCombos: number;
    publishedCombos: number;
    zeroClickCombos: number;
  };
  series: DayPoint[];
  byCc: SlugRow[];
  bySchool: SlugRow[];
  byMajor: SlugRow[];
  combos: ComboRow[];
  top: ComboRow[];
  bottom: ComboRow[];
}

function shortDay(d: string): string {
  return d.slice(5);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoKey(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function SlugTable({ title, rows, total }: { title: string; rows: SlugRow[]; total: number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">No clicks in this range.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr className="text-left border-b border-slate-200">
                <th className="py-1.5 font-medium">Name</th>
                <th className="py-1.5 font-medium text-right">Clicks</th>
                <th className="py-1.5 font-medium text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((r) => (
                <tr key={r.slug} className="border-b border-slate-100">
                  <td className="py-1.5 truncate max-w-[260px]">{r.name}</td>
                  <td className="py-1.5 text-right tabular-nums font-medium">{r.count}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-500">
                    {total > 0 ? `${((r.count / total) * 100).toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function ComboTable({
  title,
  rows,
  emptyText,
  highlight,
}: {
  title: string;
  rows: ComboRow[];
  emptyText: string;
  highlight: "top" | "bottom";
}) {
  const tone = highlight === "top"
    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
    : "bg-amber-50 border-amber-200 text-amber-900";
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${tone}`}>
          {highlight === "top" ? "Winners" : "Pruning candidates"}
        </Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">{emptyText}</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr className="text-left border-b border-slate-200">
                <th className="py-1.5 font-medium">CC</th>
                <th className="py-1.5 font-medium">School</th>
                <th className="py-1.5 font-medium">Major</th>
                <th className="py-1.5 font-medium text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.fromSlug}__${r.toSlug}__${r.majorSlug}`} className="border-b border-slate-100">
                  <td className="py-1.5 truncate max-w-[160px]">{r.ccName}</td>
                  <td className="py-1.5 truncate max-w-[160px]">{r.schoolName}</td>
                  <td className="py-1.5 truncate max-w-[160px]">
                    <a href={r.path} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                      {r.majorName}
                    </a>
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-medium">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

type SortKey = "count" | "ccName" | "schoolName" | "majorName";
type SortDir = "asc" | "desc";
type RowFilter = "all" | "converted" | "zero";

function AllCombosTable({ combos }: { combos: ComboRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<RowFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [limit, setLimit] = useState(50);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = combos;
    if (filter === "converted") rows = rows.filter((c) => c.count > 0);
    if (filter === "zero") rows = rows.filter((c) => c.count === 0);
    if (needle) {
      rows = rows.filter((c) =>
        c.ccName.toLowerCase().includes(needle) ||
        c.schoolName.toLowerCase().includes(needle) ||
        c.majorName.toLowerCase().includes(needle) ||
        c.fromSlug.includes(needle) ||
        c.toSlug.includes(needle) ||
        c.majorSlug.includes(needle),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      if (sortKey === "count") return a.count - b.count;
      return String(a[sortKey]).localeCompare(String(b[sortKey]));
    });
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }, [combos, q, filter, sortKey, sortDir]);

  function header(label: string, key: SortKey, align: "left" | "right" = "left") {
    const active = sortKey === key;
    const arrow = active ? (sortDir === "desc" ? " ↓" : " ↑") : "";
    return (
      <th
        className={`py-1.5 font-medium cursor-pointer select-none ${align === "right" ? "text-right" : "text-left"} ${active ? "text-slate-900" : ""}`}
        onClick={() => {
          if (active) setSortDir(sortDir === "desc" ? "asc" : "desc");
          else { setSortKey(key); setSortDir(key === "count" ? "desc" : "asc"); }
        }}
      >
        {label}{arrow}
      </th>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">All combos ({combos.length})</CardTitle>
        <Badge variant="outline" className="font-mono text-[10px]">
          {filtered.length} shown
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input
            type="search"
            placeholder="Filter by CC, school, major…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 max-w-xs"
          />
          <div className="flex gap-1 text-xs">
            {(["all", "converted", "zero"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded border ${filter === f ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 hover:bg-slate-100"}`}
              >
                {f === "all" ? "All" : f === "converted" ? "Converted only" : "Zero clicks only"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-auto max-h-[480px] border border-slate-100 rounded">
          <table className="w-full text-xs">
            <thead className="text-slate-500 sticky top-0 bg-white">
              <tr className="border-b border-slate-200">
                {header("CC", "ccName")}
                {header("School", "schoolName")}
                {header("Major", "majorName")}
                {header("Clicks", "count", "right")}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((c) => (
                <tr key={`${c.fromSlug}__${c.toSlug}__${c.majorSlug}`} className="border-b border-slate-100">
                  <td className="py-1.5 truncate max-w-[180px]">{c.ccName}</td>
                  <td className="py-1.5 truncate max-w-[180px]">{c.schoolName}</td>
                  <td className="py-1.5 truncate max-w-[200px]">
                    <a href={c.path} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                      {c.majorName}
                    </a>
                  </td>
                  <td className={`py-1.5 text-right tabular-nums font-medium ${c.count === 0 ? "text-slate-400" : ""}`}>
                    {c.count}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-slate-500">No matching combos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > limit && (
          <div className="mt-2 flex justify-center">
            <button
              onClick={() => setLimit(limit + 100)}
              className="text-xs px-3 py-1 rounded border border-slate-200 hover:bg-slate-100"
            >
              Show more ({filtered.length - limit} remaining)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSeoConversions() {
  const [, setLocation] = useLocation();
  const [from, setFrom] = useState<string>(daysAgoKey(29));
  const [to, setTo] = useState<string>(todayKey());
  const [pendingFrom, setPendingFrom] = useState<string>(from);
  const [pendingTo, setPendingTo] = useState<string>(to);
  const [data, setData] = useState<SeoResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    let cancel = false;
    setStatus("loading");
    const qs = new URLSearchParams({ from, to });
    fetch(`/api/admin/seo-conversions?${qs}`, { credentials: "include" })
      .then(async (r) => {
        if (cancel) return;
        if (r.status === 404) { setStatus("notfound"); return; }
        if (!r.ok) { setStatus("error"); return; }
        const j = (await r.json()) as SeoResponse;
        setData(j);
        setStatus("ok");
      })
      .catch(() => { if (!cancel) setStatus("error"); });
    return () => { cancel = true; };
  }, [from, to]);

  const totalClicks = data?.totals.clicks ?? 0;
  const avgPerDay = useMemo(() => {
    if (!data || data.range.days === 0) return 0;
    return totalClicks / data.range.days;
  }, [data, totalClicks]);

  if (status === "notfound") return <NotFound />;
  if (status === "error") {
    return (
      <main id="main-content" className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Couldn't load SEO conversions</h1>
        <p className="text-sm text-slate-600 mt-2">Please try again in a moment.</p>
        <button
          className="mt-4 text-sm text-indigo-600 underline"
          onClick={() => setLocation("/dashboard")}
        >Back to dashboard</button>
      </main>
    );
  }

  return (
    <main id="main-content" className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">SEO conversion dashboard</h1>
          <p className="text-sm text-slate-500">
            Owner-only. Clicks on the transfer-guide signup CTA, by combo (UTC).
          </p>
        </div>
        {data && (
          <Badge variant="outline" className="font-mono text-xs">
            {data.range.from} → {data.range.to} ({data.range.days}d)
          </Badge>
        )}
      </header>

      {/* Date range filter */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-600 flex flex-col gap-1">
            From
            <Input
              type="date"
              value={pendingFrom}
              max={pendingTo}
              onChange={(e) => setPendingFrom(e.target.value)}
              className="h-9 w-44"
            />
          </label>
          <label className="text-xs text-slate-600 flex flex-col gap-1">
            To
            <Input
              type="date"
              value={pendingTo}
              min={pendingFrom}
              max={todayKey()}
              onChange={(e) => setPendingTo(e.target.value)}
              className="h-9 w-44"
            />
          </label>
          <Button
            size="sm"
            onClick={() => { setFrom(pendingFrom); setTo(pendingTo); }}
            disabled={!pendingFrom || !pendingTo || (pendingFrom === from && pendingTo === to)}
          >
            Apply
          </Button>
          <div className="flex flex-wrap gap-2 text-xs ml-auto">
            {[
              { label: "7d", days: 6 },
              { label: "30d", days: 29 },
              { label: "90d", days: 89 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  const f = daysAgoKey(p.days); const t = todayKey();
                  setPendingFrom(f); setPendingTo(t); setFrom(f); setTo(t);
                }}
                className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100"
              >
                Last {p.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {status === "loading" || !data ? (
        <div className="text-sm text-slate-500">Loading conversions…</div>
      ) : (
        <>
          {/* Summary tiles */}
          <section className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Signup clicks</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{totalClicks}</div>
                <div className="text-xs text-slate-500 mt-1">In selected range.</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Combos that converted</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {data.totals.uniqueCombos}
                  <span className="text-slate-400 text-base"> / {data.totals.publishedCombos}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {data.totals.zeroClickCombos} published page(s) got zero clicks.
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Avg clicks / day</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{avgPerDay.toFixed(1)}</div>
                <div className="text-xs text-slate-500 mt-1">Across {data.range.days} day(s).</div>
              </CardContent>
            </Card>
          </section>

          {/* Time series */}
          <section>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Clicks over time</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                {totalClicks === 0 ? (
                  <p className="text-xs text-slate-500">No signup clicks in this range yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.series.map((d) => ({ ...d, day: shortDay(d.day) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <RTooltip />
                      <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#c7d2fe" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Top + bottom combos */}
          <section className="grid gap-4 lg:grid-cols-2">
            <ComboTable
              title="Top performing combos"
              rows={data.top}
              emptyText="No clicks yet."
              highlight="top"
            />
            <ComboTable
              title="Lowest performing combos (zero-click first)"
              rows={data.bottom}
              emptyText="No published pages yet."
              highlight="bottom"
            />
          </section>

          {/* Slug breakdowns */}
          <section className="grid gap-4 lg:grid-cols-3">
            <SlugTable title="By community college" rows={data.byCc} total={totalClicks} />
            <SlugTable title="By transfer school" rows={data.bySchool} total={totalClicks} />
            <SlugTable title="By major" rows={data.byMajor} total={totalClicks} />
          </section>

          <section>
            <AllCombosTable combos={data.combos} />
          </section>

          <p className="text-[10px] text-slate-400 italic">
            Source: <code>seo_signup_clicks</code>. Returning 404 to non-owners — the route's
            existence isn't leaked.
          </p>
        </>
      )}
    </main>
  );
}
