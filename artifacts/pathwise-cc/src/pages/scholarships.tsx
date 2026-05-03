import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "wouter";
import { useTranslation } from "react-i18next";
import Nav from "@/components/nav";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ExternalLink, Search, Award, Briefcase, GraduationCap, BookOpen,
  Star, Loader2, Building2, Heart, Users, Stethoscope, Palette,
  MapPin, ChevronRight, Info, Sparkles, Globe, RefreshCcw, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveQuota } from "@/hooks/use-live-quota";

interface Scholarship {
  id: string;
  name: string;
  amount: string;
  deadline: string;
  minGpa?: number | null;
  eligibilityTags: string[];
  description: string;
  sourceUrl: string;
  _relevanceScore?: number;
}

interface Opportunity {
  id: string;
  name: string;
  type: string;
  description: string;
  eligibilityTags: string[];
  applicationUrl: string;
  _relevanceScore?: number;
}

interface CCOpportunityItem {
  name: string;
  type: string;
  description: string;
  howToJoin: string;
  website?: string;
  majorsServed?: string[];
}

interface CCOpportunitiesResult {
  college: string;
  summary: string;
  programs: CCOpportunityItem[];
}

// ─── Type config for CC programs ──────────────────────────────────────────────
const CC_TYPE_CONFIG: Record<string, { labelKey: string; icon: React.ElementType; badge: string }> = {
  honors:          { labelKey: "pages.scholarships.cc_honors",           icon: Award,        badge: "bg-amber-100 text-amber-700 border-amber-200" },
  equity_support:  { labelKey: "pages.scholarships.cc_equity_support",   icon: Heart,        badge: "bg-rose-100 text-rose-700 border-rose-200" },
  equity_cohort:   { labelKey: "pages.scholarships.cc_equity_cohort",    icon: Users,        badge: "bg-violet-100 text-violet-700 border-violet-200" },
  academic_support:{ labelKey: "pages.scholarships.cc_academic_support", icon: BookOpen,     badge: "bg-sky-100 text-sky-700 border-sky-200" },
  career_transfer: { labelKey: "pages.scholarships.cc_career_transfer",  icon: Briefcase,    badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  student_gov:     { labelKey: "pages.scholarships.cc_student_gov",      icon: Star,         badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  major_club:      { labelKey: "pages.scholarships.cc_major_club",       icon: GraduationCap,badge: "bg-teal-100 text-teal-700 border-teal-200" },
  cultural_org:    { labelKey: "pages.scholarships.cc_cultural_org",     icon: Users,        badge: "bg-orange-100 text-orange-700 border-orange-200" },
  health_wellness: { labelKey: "pages.scholarships.cc_health_wellness",  icon: Stethoscope,  badge: "bg-green-100 text-green-700 border-green-200" },
  arts_athletics:  { labelKey: "pages.scholarships.cc_arts_athletics",   icon: Palette,      badge: "bg-pink-100 text-pink-700 border-pink-200" },
  stem_research:   { labelKey: "pages.scholarships.cc_stem_research",    icon: Sparkles,     badge: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

const CC_FILTER_TYPES = [
  { key: "all",             labelKey: "pages.scholarships.filter_all" },
  { key: "honors",          labelKey: "pages.scholarships.filter_honors" },
  { key: "equity_support",  labelKey: "pages.scholarships.filter_equity_support" },
  { key: "equity_cohort",   labelKey: "pages.scholarships.filter_equity_cohort" },
  { key: "academic_support",labelKey: "pages.scholarships.filter_academic_support" },
  { key: "career_transfer", labelKey: "pages.scholarships.filter_career_transfer" },
  { key: "major_club",      labelKey: "pages.scholarships.filter_major_club" },
  { key: "cultural_org",    labelKey: "pages.scholarships.filter_cultural_org" },
  { key: "health_wellness", labelKey: "pages.scholarships.filter_health_wellness" },
  { key: "stem_research",   labelKey: "pages.scholarships.filter_stem_research" },
];

// ─── Live Scholarship Search (Perplexity) ─────────────────────────────────────
interface PplxResult {
  answer: string;
  citations: Array<{ title?: string; url: string }>;
}

function LiveScholarshipSearch({ profileId }: { profileId?: number }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PplxResult | null>(null);
  const [open, setOpen] = useState(false);
  const { quota, refresh: refreshQuota } = useLiveQuota();

  const onCooldown = (quota?.cooldownSecondsLeft ?? 0) > 0;
  const noneLeft = quota ? quota.remainingToday <= 0 : false;
  // Only block on `loading` — cached repeats are served for free even when
  // cooldown is active or the daily cap is reached, so let the server decide.
  const disabled = loading;

  const runSearch = async (overrideQuery?: string) => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/live/scholarships", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, query: overrideQuery ?? query }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: t("pages.scholarships.searchFailed") }));
        throw new Error(err.error ?? t("pages.scholarships.searchFailed"));
      }
      setResult(await r.json());
      setOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("pages.scholarships.searchFailed");
      toast({ title: t("pages.scholarships.liveUnavailable"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
      void refreshQuota();
    }
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
          <Globe className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            {t("pages.scholarships.liveSearchTitle")}
            <span className="text-[10px] uppercase tracking-wider bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full font-bold">{t("common.beta", { defaultValue: "Beta" })}</span>
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {t("pages.scholarships.liveSearchDesc")}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder={t("pages.scholarships.livePlaceholder")}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !loading) void runSearch(); }}
          className="bg-white"
        />
        <button
          onClick={() => void runSearch()}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? t("pages.scholarships.searching") : t("pages.scholarships.searchBtn")}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <p className="text-[10px] text-slate-500 italic">
          {t("pages.scholarships.liveCreditNote")}
        </p>
        {quota && (
          <p
            className={cn(
              "text-[10px] font-semibold",
              noneLeft ? "text-red-600" : onCooldown ? "text-amber-600" : "text-violet-700",
            )}
            data-testid="live-quota-scholarships"
          >
            {onCooldown
              ? t("pages.scholarships.cooldown", { seconds: quota.cooldownSecondsLeft })
              : t("pages.scholarships.searchesLeft", { remaining: quota.remainingToday, total: quota.dailyCap })}
          </p>
        )}
      </div>

      {result && open && (
        <div className="mt-4 bg-white border border-violet-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> {t("pages.scholarships.liveResults")}
            </p>
            <button onClick={() => setOpen(false)} className="text-xs text-slate-700 hover:text-slate-900 underline focus:outline-none focus:ring-2 focus:ring-violet-500 px-1">{t("pages.scholarships.hide")}</button>
          </div>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
            {result.answer}
          </div>
          {result.citations.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t("pages.scholarships.sourcesLabel")}</p>
              <ul className="space-y-1.5">
                {result.citations.slice(0, 8).map((c, i) => (
                  <li key={i} className="text-xs">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-900 hover:text-violet-800 hover:underline inline-flex items-center gap-1"
                    >
                      <span className="font-semibold text-slate-400">{i + 1}.</span>
                      <span className="truncate max-w-[400px]">{c.title ?? c.url}</span>
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
  );
}

// ─── CC Program Card ──────────────────────────────────────────────────────────
function CCProgramCard({ program }: { program: CCOpportunityItem }) {
  const { t } = useTranslation();
  const cfg = CC_TYPE_CONFIG[program.type] ?? { labelKey: `pages.scholarships.cc_${program.type}`, icon: Star, badge: "bg-slate-100 text-slate-600 border-slate-200" };
  const Icon = cfg.icon;

  return (
    <Card className="hover:border-indigo-200 hover:shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 text-sm">{program.name}</h3>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", cfg.badge)}>
                {t(cfg.labelKey)}
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-2 leading-relaxed">{program.description}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1 text-indigo-600 font-medium">
                <ChevronRight className="h-3 w-3" />
                {program.howToJoin}
              </div>
              {program.majorsServed && program.majorsServed[0] !== "All majors" && (
                <div className="flex flex-wrap gap-1">
                  {program.majorsServed.slice(0, 3).map(m => (
                    <span key={m} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{m}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {program.website && (
            <a href={program.website} target="_blank" rel="noopener noreferrer"
              aria-label={t("pages.scholarships.openInNewTab", { name: program.name })}
              className="text-indigo-700 hover:text-indigo-900 flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 p-1">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Scholarships() {
  const { t } = useTranslation();
  const { profileId } = useParams<{ profileId?: string }>();
  const { toast } = useToast();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"scholarships" | "cc_programs">("scholarships");

  // CC programs state
  const [ccOpps, setCcOpps] = useState<CCOpportunitiesResult | null>(null);
  const [ccLoading, setCcLoading] = useState(false);
  const [ccFilter, setCcFilter] = useState("all");

  const pid = profileId ? parseInt(profileId) : null;

  useEffect(() => {
    const scholarshipUrl = pid ? `/api/profiles/${pid}/recommended-scholarships` : "/api/scholarships";
    const scholarshipMethod = pid ? "POST" : "GET";

    fetch(scholarshipUrl, { method: scholarshipMethod, credentials: "include" })
      .then(r => r.json())
      .then((s: Scholarship[]) => setScholarships(s))
      .catch(() => toast({ title: t("pages.scholarships.toastErrorScholarships"), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [pid]);

  // Load CC programs when tab is opened (if profile exists)
  const ccLoadedRef = useRef(false);
  const handleCCTab = () => {
    setTab("cc_programs");
    if (!pid || ccLoadedRef.current) return;
    ccLoadedRef.current = true;
    setCcLoading(true);
    fetch(`/api/profiles/${pid}/cc-campus-opportunities`, { credentials: "include" })
      .then(r => r.json())
      .then((d: CCOpportunitiesResult) => setCcOpps(d))
      .catch(() => toast({ title: t("pages.scholarships.toastErrorCC"), variant: "destructive" }))
      .finally(() => setCcLoading(false));
  };

  const filteredScholarships = useMemo(() =>
    scholarships.filter(s =>
      !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
    ), [scholarships, search]);

  const filteredCCPrograms = useMemo(() => {
    if (!ccOpps) return [];
    const progs = ccOpps.programs;
    return ccFilter === "all" ? progs : progs.filter(p => p.type === ccFilter);
  }, [ccOpps, ccFilter]);

  // Count by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ccOpps?.programs.length ?? 0 };
    (ccOpps?.programs ?? []).forEach(p => { counts[p.type] = (counts[p.type] ?? 0) + 1; });
    return counts;
  }, [ccOpps]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav profileId={pid ?? undefined} />
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none px-4 md:px-8 max-w-5xl mx-auto">
        <div className="py-6 border-b-2 border-slate-900 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">{t("pages.scholarships.pageTitle")}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {pid
              ? t("pages.scholarships.personalizedDesc")
              : t("pages.scholarships.browseDesc")}{" "}
            {t("pages.scholarships.verifyOfficial")}
          </p>
        </div>

        {/* Tab bar */}
        <div role="tablist" aria-label={t("pages.scholarships.opportunityCategories")} className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            role="tab"
            aria-selected={tab === "scholarships"}
            onClick={() => setTab("scholarships")}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] focus:outline-none focus:ring-2 focus:ring-indigo-500",
              tab === "scholarships" ? "bg-white text-indigo-800 shadow-sm" : "text-slate-700 hover:text-slate-900")}
          >
            <Award className="inline h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {t("pages.scholarships.scholarshipsTab")} ({filteredScholarships.length})
          </button>
          <button
            role="tab"
            aria-selected={tab === "cc_programs"}
            onClick={handleCCTab}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] focus:outline-none focus:ring-2 focus:ring-indigo-500",
              tab === "cc_programs" ? "bg-white text-indigo-800 shadow-sm" : "text-slate-700 hover:text-slate-900")}
          >
            <Building2 className="inline h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {t("pages.scholarships.myCCPrograms")}
          </button>
        </div>

        {/* ── Scholarships tab ── */}
        {tab === "scholarships" && (
          <>
            {/* Live web search panel (Perplexity) */}
            <LiveScholarshipSearch profileId={pid ?? undefined} />

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder={t("pages.scholarships.searchPlaceholder")} value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-3 pb-12">
              {filteredScholarships.map(s => (
                <Card key={s.id} className="hover:border-indigo-200 hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{s.name}</h3>
                          {s.minGpa && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t("pages.scholarships.gpaPrefix")} {s.minGpa}+</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{s.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="font-semibold text-emerald-600">{s.amount}</span>
                          <span>{t("pages.scholarships.deadline")} {s.deadline}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.eligibilityTags.slice(0, 5).map(tag => (
                            <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer"
                          aria-label={t("pages.scholarships.openInNewTab", { name: s.name })}
                          className="text-indigo-700 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 p-1">
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("dyp:start-interview", { detail: { target: s.name } }))}
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-amber-100 text-slate-900 border border-amber-300 hover:bg-amber-200 rounded-full"
                          title={t("pages.scholarships.practiceTitle")}
                          data-testid={`practice-interview-${s.id}`}
                        >
                          <Mic className="h-3 w-3" /> {t("pages.scholarships.practice")}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* ── CC Programs tab ── */}
        {tab === "cc_programs" && (
          <>
            {!pid ? (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 text-center mb-6">
                <Building2 className="h-10 w-10 text-indigo-300 mx-auto mb-3" />
                <p className="text-slate-700 font-medium mb-1">{t("pages.scholarships.signInPrompt")}</p>
                <p className="text-slate-500 text-sm">{t("pages.scholarships.ccDescriptor")}</p>
              </div>
            ) : ccLoading ? (
              <div className="text-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">{t("pages.scholarships.loadingPrograms")}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {t("pages.scholarships.compilingPrograms")}
                </p>
              </div>
            ) : ccOpps ? (
              <div className="space-y-5 pb-12">
                {/* College summary banner */}
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-indigo-900 text-base">{ccOpps.college}</h2>
                    <p className="text-sm text-indigo-700 mt-0.5 leading-relaxed">{ccOpps.summary}</p>
                    <p className="text-xs text-indigo-400 mt-1.5 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      AI-generated based on publicly known programs at your college. Verify availability with your college's student services.
                    </p>
                  </div>
                </div>

                {/* Filter row */}
                <div className="flex flex-wrap gap-1.5">
                  {CC_FILTER_TYPES.map(({ key, labelKey }) => {
                    const count = typeCounts[key] ?? 0;
                    if (key !== "all" && count === 0) return null;
                    return (
                      <button key={key}
                        onClick={() => setCcFilter(key)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-semibold border transition",
                          ccFilter === key
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {t(labelKey)} ({key === "all" ? typeCounts.all : count})
                      </button>
                    );
                  })}
                </div>

                {/* Program cards */}
                <div className="space-y-3">
                  {filteredCCPrograms.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">{t("pages.scholarships.noProgramsMatch")}</div>
                  ) : (
                    filteredCCPrograms.map((program, i) => (
                      <CCProgramCard key={i} program={program} />
                    ))
                  )}
                </div>

                {/* Key CC resources callout */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">{t("pages.scholarships.highPriority")}</p>
                  <div className="grid sm:grid-cols-3 gap-2 text-xs text-emerald-700">
                    <div className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-500" /><strong>Phi Theta Kappa</strong> — boosts transfer applications</div>
                    <div className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-rose-500" /><strong>EOPS</strong> — priority registration + financial support</div>
                    <div className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-indigo-500" /><strong>Transfer Center</strong> — free UC/CSU app help</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-sm">
                Could not load programs. Please try again.
              </div>
            )}
          </>
        )}

        <p className="text-xs text-slate-400 text-center pb-8">
          Program availability varies by campus. Always confirm with your college's student services office.
          DYP is not affiliated with any institution or scholarship program.
        </p>
      </main>
    </div>
  );
}
