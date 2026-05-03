import { useState } from "react";
import { useParams } from "wouter";
import Nav from "@/components/nav";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLiveQuota } from "@/hooks/use-live-quota";
import { PageMotion } from "@/components/page-motion";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, useMotionEnabled, useDirSign, hoverLift, DUR } from "@/lib/motion";
import {
  CalendarDays, CheckCircle2, Clock, AlertCircle, ExternalLink,
  ChevronRight, Info, GraduationCap, DollarSign, FileText,
  Globe, RefreshCcw, Loader2, Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Deadline {
  id: string;
  month: number; // 1-12
  day: number;
  endDay?: number;
  label: string;
  description: string;
  category: "uc" | "csu" | "financial_aid" | "tag" | "scholarship" | "decision";
  url: string;
  priority: "critical" | "high" | "medium";
}

// ─── Annual transfer deadlines (month/day, year computed dynamically) ─────────
const ANNUAL_DEADLINES: Deadline[] = [
  { id: "tag", month: 9, day: 1, endDay: 30, label: "TAG Filing Window", description: "Submit your Transfer Admission Guarantee application to UC Davis, UCI, UCM, UCR, UCSB, or UCSC. Filing this guarantees admission if you meet the GPA and unit requirements.", category: "tag", url: "https://admission.universityofcalifornia.edu/admission-requirements/transfer-requirements/transfer-admission-guarantee-tag.html", priority: "critical" },
  { id: "fafsa", month: 10, day: 1, label: "FAFSA / CA Dream Act Opens", description: "Federal Student Aid and California Dream Act applications open. Applying early maximizes your Cal Grant eligibility and institutional aid priority.", category: "financial_aid", url: "https://studentaid.gov", priority: "critical" },
  { id: "csu-open", month: 10, day: 1, label: "CSU Application Opens (Cal State Apply)", description: "The Cal State Apply portal opens for the following fall transfer applicants. Apply early — some CSU campuses fill up.", category: "csu", url: "https://www.calstate.edu/apply", priority: "high" },
  { id: "uc-open", month: 11, day: 1, label: "UC Application Opens (UC Apply)", description: "The UC application portal opens. You can apply to up to 9 UC campuses on a single application.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "critical" },
  { id: "csu-deadline", month: 11, day: 30, label: "CSU Application Deadline", description: "Last day to submit CSU transfer applications. Some impacted campuses may have earlier deadlines — verify with each campus.", category: "csu", url: "https://www.calstate.edu/apply", priority: "critical" },
  { id: "uc-deadline", month: 11, day: 30, label: "UC Application Deadline", description: "Last day to submit UC transfer applications. The personal insight questions (PIQs) are due by this date.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "critical" },
  { id: "cal-grant-prelim", month: 10, day: 15, label: "Cal Grant GPA Verification (Preliminary)", description: "Your CC financial aid office submits GPA data to CSAC. Ensure your GPA is on file.", category: "financial_aid", url: "https://www.csac.ca.gov/cal-grants", priority: "high" },
  { id: "uc-piq", month: 1, day: 1, label: "UC Additional Information Deadline", description: "Last chance to add additional information to your UC application (if prompted). Responds to requests from UC campuses.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "medium" },
  { id: "cal-grant", month: 3, day: 2, label: "Cal Grant Application Deadline", description: "Final Cal Grant deadline — submit your FAFSA or California Dream Act Application by this date to be eligible for Cal Grants.", category: "financial_aid", url: "https://www.csac.ca.gov/cal-grants", priority: "critical" },
  { id: "jkc", month: 3, day: 1, label: "Jack Kent Cooke Transfer Scholarship", description: "Annual deadline for the JKC Transfer Scholarship — up to $55,000/year for high-achieving CC students with financial need.", category: "scholarship", url: "https://www.jkcf.org/our-scholarships/college-scholarship/", priority: "high" },
  { id: "uc-decisions", month: 4, day: 1, label: "UC Admission Decisions (approx.)", description: "Most UC campuses release transfer admission decisions in late March–April. Check your UC Apply portal.", category: "decision", url: "https://apply.universityofcalifornia.edu", priority: "medium" },
  { id: "csu-decisions", month: 4, day: 30, label: "CSU Admission Decisions (approx.)", description: "Most CSU campuses finalize transfer admission decisions by late April.", category: "decision", url: "https://www.calstate.edu/apply", priority: "medium" },
  { id: "reply-day", month: 5, day: 1, label: "National College Decision Day", description: "Deadline to accept your offer of admission and submit the Statement of Intent to Register (SIR). Must pay enrollment deposit.", category: "decision", url: "https://admission.universityofcalifornia.edu", priority: "critical" },
  { id: "final-transcript", month: 7, day: 15, label: "Final Official Transcripts Due", description: "Submit final official transcripts from your CC to your transfer university. Admission may be revoked if not received.", category: "uc", url: "https://admission.universityofcalifornia.edu", priority: "high" },
];

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; badge: string; bar: string }> = {
  uc:           { label: "UC",           icon: GraduationCap,  badge: "bg-blue-100 text-blue-700 border-blue-200",    bar: "bg-blue-500" },
  csu:          { label: "CSU",          icon: GraduationCap,  badge: "bg-green-100 text-green-700 border-green-200", bar: "bg-green-500" },
  financial_aid:{ label: "Financial Aid",icon: DollarSign,     badge: "bg-amber-100 text-amber-700 border-amber-200", bar: "bg-amber-500" },
  tag:          { label: "TAG",          icon: CheckCircle2,   badge: "bg-indigo-100 text-indigo-700 border-indigo-200",bar: "bg-indigo-500" },
  scholarship:  { label: "Scholarship",  icon: FileText,       badge: "bg-rose-100 text-rose-700 border-rose-200",    bar: "bg-rose-500" },
  decision:     { label: "Decision",     icon: AlertCircle,    badge: "bg-slate-100 text-slate-700 border-slate-200", bar: "bg-slate-400" },
};

const PRIORITY_CONFIG: Record<string, { dot: string; label: string }> = {
  critical: { dot: "bg-red-500",    label: "Critical" },
  high:     { dot: "bg-amber-500",  label: "High" },
  medium:   { dot: "bg-slate-400",  label: "Medium" },
};

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function getDeadlineDate(d: Deadline, cycleYear: number): Date {
  const year = d.month >= 8 ? cycleYear : cycleYear + 1;
  return new Date(year, d.month - 1, d.endDay ?? d.day);
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateRange(d: Deadline, year: number): string {
  const y = d.month >= 8 ? year : year + 1;
  if (d.endDay) return `${MONTH_NAMES[d.month]} ${d.day}–${d.endDay}, ${y}`;
  return `${MONTH_NAMES[d.month]} ${d.day}, ${y}`;
}

interface VerifyResult {
  answer: string;
  citations: Array<{ title?: string; url: string }>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DeadlineCalendar() {
  const dcMotionOn = useMotionEnabled();
  const dcDir = useDirSign();
  const dcLift = hoverLift(dcDir);
  const { profileId } = useParams<{ profileId?: string }>();
  const pid = profileId ? parseInt(profileId) : undefined;
  const { toast } = useToast();

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const { quota, refresh: refreshQuota } = useLiveQuota();
  const onCooldown = (quota?.cooldownSecondsLeft ?? 0) > 0;
  const noneLeft = quota ? quota.remainingToday <= 0 : false;
  // Only block on `verifying` — cached repeats are still served when cooldown
  // is active or the daily cap is reached, so let the server decide.
  const verifyDisabled = verifying;

  // Determine transfer cycle: current academic year starts August
  const now = new Date();
  const cycleYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const nextCycleYear = cycleYear + 1;

  // Sort by date
  const sorted = [...ANNUAL_DEADLINES].sort((a, b) => {
    const da = getDeadlineDate(a, cycleYear);
    const db = getDeadlineDate(b, cycleYear);
    return da.getTime() - db.getTime();
  });

  const upcoming = sorted.filter(d => daysUntil(getDeadlineDate(d, cycleYear)) >= -7);
  const past = sorted.filter(d => daysUntil(getDeadlineDate(d, cycleYear)) < -7);

  const nextCritical = upcoming.find(d => d.priority === "critical");

  const verifyDeadlines = async () => {
    if (verifying) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const payload = upcoming.slice(0, 10).map(d => ({
        label: d.label,
        date: formatDateRange(d, cycleYear),
      }));
      const r = await fetch("/api/live/verify-deadlines", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadlines: payload }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Verify failed" }));
        throw new Error(err.error ?? "Verify failed");
      }
      setVerifyResult(await r.json());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Live verify failed";
      toast({ title: "Verification unavailable", description: msg, variant: "destructive" });
    } finally {
      setVerifying(false);
      void refreshQuota();
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav profileId={pid} />
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none px-4 md:px-8 max-w-3xl mx-auto">
        <div className="py-7">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">Transfer Deadline Calendar</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Key dates for the <strong>{cycleYear}–{nextCycleYear} transfer cycle</strong>. Verify exact dates with each institution — deadlines may shift.
          </p>
        </div>

        <PageMotion>
        {/* Next critical deadline banner */}
        {nextCritical && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">
                Next critical deadline: {nextCritical.label}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {formatDateRange(nextCritical, cycleYear)} · {Math.max(0, daysUntil(getDeadlineDate(nextCritical, cycleYear)))} days away
              </p>
            </div>
            <a href={nextCritical.url} target="_blank" rel="noopener noreferrer"
              className="text-red-500 hover:text-red-700 flex-shrink-0">
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Live verification (Perplexity) */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Verify Dates Live
                <span className="text-[10px] uppercase tracking-wider bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full font-bold">Beta</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Cross-check upcoming deadlines against current UC, CSU, and CSAC sources.
              </p>
            </div>
            <button
              onClick={() => void verifyDeadlines()}
              disabled={verifyDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              {verifying ? "Verifying..." : "Verify"}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
            <p className="text-[10px] text-slate-500 italic">
              Uses one live web-search credit. Cached for 24 hours.
            </p>
            {quota && (
              <p
                className={cn(
                  "text-[10px] font-semibold",
                  noneLeft ? "text-red-600" : onCooldown ? "text-amber-600" : "text-violet-700",
                )}
                data-testid="live-quota-deadlines"
              >
                {onCooldown
                  ? `Cooldown: ${quota.cooldownSecondsLeft}s`
                  : `${quota.remainingToday} of ${quota.dailyCap} live searches left today`}
              </p>
            )}
          </div>
          {verifyResult && (
            <div className="bg-white border border-violet-200 rounded-xl p-3 mt-2 space-y-3">
              <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Live Verification
              </p>
              <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {verifyResult.answer}
              </div>
              {verifyResult.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sources</p>
                  <ul className="space-y-1">
                    {verifyResult.citations.slice(0, 6).map((c, i) => (
                      <li key={i} className="text-xs">
                        <a href={c.url} target="_blank" rel="noopener noreferrer"
                          className="text-slate-900 hover:text-violet-800 hover:underline inline-flex items-center gap-1">
                          <span className="font-semibold text-slate-400">{i + 1}.</span>
                          <span className="truncate max-w-[360px]">{c.title ?? c.url}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category filter legend */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <span key={key} className={cn("text-xs px-2.5 py-1 rounded-full border font-semibold", cfg.badge)}>
              {cfg.label}
            </span>
          ))}
        </div>

        {/* Upcoming deadlines */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Upcoming</h2>
          <motion.div
            className="space-y-3"
            initial={dcMotionOn ? "hidden" : false}
            whileInView={dcMotionOn ? "show" : undefined}
            viewport={{ once: true, margin: "-50px" }}
            variants={dcMotionOn ? staggerContainer(0.06) : undefined}
          >
          {upcoming.map(d => {
            const date = getDeadlineDate(d, cycleYear);
            const days = daysUntil(date);
            const cfg = CATEGORY_CONFIG[d.category] ?? CATEGORY_CONFIG.decision;
            const Icon = cfg.icon;
            const pri = PRIORITY_CONFIG[d.priority];
            const isImminent = days >= 0 && days <= 14;

            return (
              <motion.div
                key={d.id}
                variants={dcMotionOn ? fadeUp(6, DUR.base) : undefined}
                whileHover={dcMotionOn ? dcLift : undefined}
                className={cn(
                  "bg-white border rounded-2xl p-4 flex gap-3 hover:shadow-sm transition-shadow",
                  isImminent ? "border-red-200" : "border-slate-200"
                )}
              >
                <div className={cn("w-1 rounded-full self-stretch flex-shrink-0", cfg.bar)} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-900">{d.label}</h3>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1", cfg.badge)}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className={cn("w-1.5 h-1.5 rounded-full", pri.dot)} />
                      <span className="text-slate-500">{pri.label}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">{d.description}</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">{formatDateRange(d, cycleYear)}</span>
                      {days >= 0 && (
                        <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                          days <= 7 ? "bg-red-100 text-red-700" : days <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {days === 0 ? "TODAY" : `${days}d`}
                        </span>
                      )}
                    </div>
                    <a href={d.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                      Official site <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </motion.div>
        </section>

        {/* Past deadlines */}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Past (this cycle)</h2>
            <motion.div
              className="space-y-2"
              initial={dcMotionOn ? "hidden" : false}
              whileInView={dcMotionOn ? "show" : undefined}
              viewport={{ once: true, margin: "-50px" }}
              variants={dcMotionOn ? staggerContainer(0.06) : undefined}
            >
            {past.map(d => {
              const cfg = CATEGORY_CONFIG[d.category] ?? CATEGORY_CONFIG.decision;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={d.id}
                  variants={dcMotionOn ? fadeUp(6, DUR.base) : undefined}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-3 opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-slate-600 line-through">{d.label}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1", cfg.badge)}>
                        <Icon className="h-3 w-3" />{cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateRange(d, cycleYear)}</p>
                  </div>
                </motion.div>
              );
            })}
            </motion.div>
          </section>
        )}

        {/* Disclaimer */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Dates are approximate based on historical patterns. Always verify exact deadlines at each institution's official admissions website. Some programs (nursing, architecture, etc.) have earlier deadlines.
          </p>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6 pb-4">
          DYP Transfer Calendar · {cycleYear}–{nextCycleYear} cycle · Verify all dates officially
        </p>
        </PageMotion>
      </main>
    </div>
  );
}
