import { useEffect, useState } from "react";
import { useParams } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Search, Loader2, ExternalLink, MapPin, Clock, DollarSign,
  ChevronDown, ChevronUp, Star, Shield, Beaker, Building2,
  Heart, Landmark, Info, Sparkles, GraduationCap, RefreshCcw,
  CalendarDays, BookOpen, CheckCircle2, AlertCircle, Bookmark,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type InternshipType = "federal" | "california_state" | "research" | "private" | "nonprofit";

interface InternshipMatch {
  id: string;
  title: string;
  organization: string;
  type: InternshipType;
  category: string;
  duration: string;
  terms: string[];
  stipend: string;
  location: string;
  eligibility: string[];
  applicationDeadline: string;
  applicationUrl: string;
  whyMatches: string;
  matchScore: number;
  citizenshipRequired: boolean;
  handshakeTip?: string;
  source: string;
}

interface SearchResult {
  id: number;
  summary: string | null;
  resultsJson: {
    summary: string;
    handshakeGuide: string;
    internships: InternshipMatch[];
  } | null;
  createdAt: string;
}

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<InternshipType, {
  label: string; icon: React.ElementType;
  bg: string; text: string; border: string; badge: string;
}> = {
  federal:          { label: "Federal Gov't",  icon: Landmark,  bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    badge: "bg-blue-100 text-blue-700 border-blue-200" },
  california_state: { label: "CA State",       icon: Shield,    bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  research:         { label: "Research",       icon: Beaker,    bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  badge: "bg-violet-100 text-violet-700 border-violet-200" },
  private:          { label: "Private Sector", icon: Building2, bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-700 border-amber-200" },
  nonprofit:        { label: "Nonprofit",      icon: Heart,     bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    badge: "bg-rose-100 text-rose-700 border-rose-200" },
};

const TERM_COLORS: Record<string, string> = {
  Summer: "bg-orange-100 text-orange-700 border-orange-200",
  Fall:   "bg-amber-100 text-amber-700 border-amber-200",
  Spring: "bg-sky-100 text-sky-700 border-sky-200",
};

// ─── Score badge ──────────────────────────────────────────────────────────────
function MatchScore({ score }: { score: number }) {
  const color = score >= 85 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm", color)}>
      {score}
    </div>
  );
}

// ─── Internship card ──────────────────────────────────────────────────────────
function InternshipCard({ internship }: { internship: InternshipMatch }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[internship.type] ?? TYPE_CONFIG.private;
  const Icon = cfg.icon;

  return (
    <div className={cn("bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col", cfg.border)}>
      {/* Card header */}
      <div className={cn("rounded-t-2xl px-4 py-3 flex items-center justify-between gap-3", cfg.bg)}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn("h-4 w-4 flex-shrink-0", cfg.text)} />
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", cfg.badge)}>
            {cfg.label}
          </span>
          <span className="text-xs text-slate-500 truncate">{internship.category}</span>
        </div>
        <MatchScore score={internship.matchScore} />
      </div>

      {/* Main content */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-snug">{internship.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">{internship.organization}</p>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-500">
            <MapPin className="h-3 w-3" />{internship.location}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="h-3 w-3" />{internship.duration}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <DollarSign className="h-3 w-3" />{internship.stipend}
          </span>
        </div>

        {/* Term + deadline */}
        <div className="flex flex-wrap items-center gap-1.5">
          {internship.terms.map(t => (
            <span key={t} className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold", TERM_COLORS[t] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
              {t}
            </span>
          ))}
          {internship.applicationDeadline && (
            <span className="flex items-center gap-1 text-xs text-slate-400 ml-1">
              <CalendarDays className="h-3 w-3" />Deadline: {internship.applicationDeadline}
            </span>
          )}
        </div>

        {/* Citizenship flag */}
        {internship.citizenshipRequired && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            U.S. Citizenship required
          </div>
        )}

        {/* Why it matches */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400" />Why This Matches You
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">{internship.whyMatches}</p>
        </div>

        {/* Expandable: eligibility + handshake + source */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Hide details" : "Show eligibility & details"}
        </button>

        {expanded && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Eligibility Requirements</p>
              <ul className="space-y-1">
                {internship.eligibility.map((req, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />{req}
                  </li>
                ))}
              </ul>
            </div>
            {internship.handshakeTip && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-2">
                <p className="text-xs font-bold text-indigo-700 mb-0.5 flex items-center gap-1">
                  <Search className="h-3 w-3" />On Handshake
                </p>
                <p className="text-xs text-indigo-600">{internship.handshakeTip}</p>
              </div>
            )}
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Info className="h-3 w-3" />{internship.source}
            </p>
          </div>
        )}

        {/* Apply button */}
        <a
          href={internship.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "mt-auto flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-colors border",
            cfg.badge, "hover:opacity-80"
          )}
        >
          Apply / Learn More
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

// ─── Search history row ───────────────────────────────────────────────────────
function SearchHistoryRow({ search, isActive, onClick }: {
  search: SearchResult; isActive: boolean; onClick: () => void;
}) {
  const count = search.resultsJson?.internships?.length ?? 0;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-xl border transition-all text-xs",
        isActive ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-500">
          {new Date(search.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">{count} matches</span>
      </div>
      {search.summary && (
        <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed">{search.summary}</p>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const ALL_TYPES: (InternshipType | "all")[] = ["all", "federal", "california_state", "research", "private", "nonprofit"];
const TYPE_LABELS: Record<string, string> = {
  all: "All",
  federal: "Federal Gov't",
  california_state: "CA State",
  research: "Research",
  private: "Private",
  nonprofit: "Nonprofit",
};

export default function InternshipsPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { toast } = useToast();
  const pid = parseInt(profileId);

  const [searches, setSearches] = useState<SearchResult[]>([]);
  const [activeSearch, setActiveSearch] = useState<SearchResult | null>(null);
  const [loadingSearches, setLoadingSearches] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterType, setFilterType] = useState<InternshipType | "all">("all");
  const [sortBy, setSortBy] = useState<"score" | "deadline">("score");
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/profiles/${pid}/internships/searches`, { credentials: "include" })
      .then(r => r.json())
      .then((s: SearchResult[]) => {
        setSearches(s);
        if (s.length > 0) setActiveSearch(s[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingSearches(false));
  }, [pid]);

  useEffect(() => {
    fetch(`/api/profiles/${pid}/saved-internships`, { credentials: "include" })
      .then(r => r.json())
      .then((rows: Array<{ internshipSlug: string }>) => {
        setSavedSlugs(new Set(rows.map(r => r.internshipSlug)));
      })
      .catch(() => {});
  }, [pid]);

  const toggleSave = async (internship: InternshipMatch) => {
    const slug = internship.id;
    const isSaved = savedSlugs.has(slug);
    try {
      if (isSaved) {
        await fetch(`/api/profiles/${pid}/saved-internships/${encodeURIComponent(slug)}`, { method: "DELETE", credentials: "include" });
        setSavedSlugs(prev => { const s = new Set(prev); s.delete(slug); return s; });
        toast({ title: "Removed from saved internships" });
      } else {
        await fetch(`/api/profiles/${pid}/saved-internships`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ internshipSlug: slug, internshipData: internship as unknown as Record<string, unknown> }),
        });
        setSavedSlugs(prev => new Set([...prev, slug]));
        toast({ title: "Internship saved!" });
      }
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const handleSearch = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`/api/profiles/${pid}/internships/search`, {
        method: "POST", credentials: "include",
      });
      if (r.status === 429) {
        toast({ title: "Rate limit reached", description: "Up to 5 searches per hour.", variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const result = await r.json() as SearchResult;
      setSearches(prev => [result, ...prev]);
      setActiveSearch(result);
      toast({ title: `Found ${result.resultsJson?.internships?.length ?? 0} internship matches!` });
    } catch {
      toast({ title: "Error finding internships", description: "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Current internship list
  const internships = activeSearch?.resultsJson?.internships ?? [];
  const filtered = filterType === "all" ? internships : internships.filter(i => i.type === filterType);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") return b.matchScore - a.matchScore;
    return a.applicationDeadline.localeCompare(b.applicationDeadline);
  });

  // Counts by type
  const typeCounts: Record<string, number> = { all: internships.length };
  internships.forEach(i => { typeCounts[i.type] = (typeCounts[i.type] ?? 0) + 1; });

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav profileId={pid} />
      <main className="pt-14 px-4 md:px-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="py-7">
          <div className="flex items-center gap-2 mb-1">
            <Search className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">Internship Finder</h1>
          </div>
          <p className="text-slate-500 text-sm max-w-2xl">
            AI-matched internships from federal government programs, California state agencies, university research, and nonprofit organizations — all verified for community college student eligibility.
          </p>
        </div>

        {/* Search / generate panel */}
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-slate-900">AI Internship Matching</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Your AI advisor scans verified California and federal internship programs, matches them to your major, GPA, location, and completed courses, and explains exactly why each one fits you.
              </p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                {[
                  { icon: Landmark, label: "Federal gov't programs" },
                  { icon: Shield, label: "CA state agencies" },
                  { icon: Beaker, label: "University research" },
                  { icon: GraduationCap, label: "CC student eligible only" },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1"><Icon className="h-3 w-3" />{label}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={handleSearch} disabled={generating} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
              {generating
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Finding your matches…</>
                : <><Search className="h-4 w-4 mr-2" />{searches.length > 0 ? "Refresh My Matches" : "Find My Internships"}</>
              }
            </Button>
            <p className="text-xs text-slate-400">Up to 5 searches per hour</p>
          </div>
          {generating && (
            <div className="mt-4 bg-white/70 rounded-xl p-4 flex items-center gap-3 border border-indigo-100">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">Matching internships to your profile…</p>
                <p className="text-xs text-slate-400">Scanning federal agencies, CA state programs, research labs, and Handshake sources. Takes 15–25 seconds.</p>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        {loadingSearches ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>
        ) : searches.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold text-lg mb-1">No internship searches yet</p>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">Click "Find My Internships" above to get a personalized list of opportunities matched to your profile.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[200px_1fr] gap-6 items-start">

            {/* Sidebar: history */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Search History</p>
              {searches.map(s => (
                <SearchHistoryRow
                  key={s.id}
                  search={s}
                  isActive={activeSearch?.id === s.id}
                  onClick={() => { setActiveSearch(s); setFilterType("all"); }}
                />
              ))}
            </div>

            {/* Main results */}
            {activeSearch && (
              <div className="space-y-5">

                {/* Summary */}
                {activeSearch.resultsJson?.summary && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400" />Your Match Summary
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">{activeSearch.resultsJson.summary}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      Generated {new Date(activeSearch.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      &nbsp;·&nbsp;{internships.length} total matches
                    </p>
                  </div>
                )}

                {/* Handshake guide */}
                {activeSearch.resultsJson?.handshakeGuide && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1">
                        Handshake Search Tips for You
                        <span className="text-[10px] font-normal bg-indigo-100 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded-full ml-1">Available at {"{your college}"} </span>
                      </p>
                      <p className="text-xs text-indigo-700 leading-relaxed">{activeSearch.resultsJson.handshakeGuide}</p>
                      <a
                        href="https://joinhandshake.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold mt-2 hover:underline"
                      >
                        Open Handshake <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Filters + sort */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TYPES.map(type => {
                      const count = typeCounts[type] ?? 0;
                      if (type !== "all" && count === 0) return null;
                      const cfg = type !== "all" ? TYPE_CONFIG[type as InternshipType] : null;
                      return (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                            filterType === type
                              ? type === "all"
                                ? "bg-slate-800 text-white border-slate-800"
                                : cn(cfg?.badge)
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {cfg && <cfg.icon className="h-3 w-3" />}
                          {TYPE_LABELS[type]} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Sort:</span>
                    <button
                      onClick={() => setSortBy("score")}
                      className={cn("px-2.5 py-1 rounded-full border transition", sortBy === "score" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 hover:border-slate-300")}
                    >
                      Best Match
                    </button>
                    <button
                      onClick={() => setSortBy("deadline")}
                      className={cn("px-2.5 py-1 rounded-full border transition", sortBy === "deadline" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 hover:border-slate-300")}
                    >
                      Deadline
                    </button>
                  </div>
                </div>

                {/* Internship cards grid */}
                {sorted.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <p className="text-slate-500">No internships match this filter.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {sorted.map(internship => (
                      <div key={internship.id} className="relative">
                        <button
                          onClick={() => void toggleSave(internship)}
                          title={savedSlugs.has(internship.id) ? "Remove from saved" : "Save internship"}
                          className={cn(
                            "absolute top-3 right-3 z-10 p-1.5 rounded-full shadow-sm border transition-all",
                            savedSlugs.has(internship.id)
                              ? "bg-indigo-600 border-indigo-600"
                              : "bg-white/90 border-slate-200 hover:border-indigo-300"
                          )}
                        >
                          <Bookmark className={cn("h-3.5 w-3.5", savedSlugs.has(internship.id) ? "fill-white text-white" : "text-slate-400")} />
                        </button>
                        <InternshipCard internship={internship} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Saved count badge */}
                {savedSlugs.size > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                    <Bookmark className="h-3.5 w-3.5 text-indigo-500 fill-indigo-500" />
                    <span><strong>{savedSlugs.size}</strong> internship{savedSlugs.size !== 1 ? "s" : ""} saved — tap the bookmark icon on any card to save or unsave</span>
                  </div>
                )}

                {/* Legend */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />How Match Scores Work
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">85+</span>Excellent fit</div>
                    <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">70+</span>Good fit</div>
                    <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-slate-400 text-white flex items-center justify-center font-bold text-[10px]">60+</span>Worth exploring</div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>Program details, deadlines, and stipends change yearly. Always verify directly at the official application URL before applying.</span>
                  </div>
                </div>

                {/* Additional resources */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />Additional Places to Search
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {[
                      { label: "USAJobs.gov — Pathways Internships", url: "https://www.usajobs.gov/help/working-in-government/unique-hiring-paths/students/", badge: "Federal", color: "bg-blue-100 text-blue-700" },
                      { label: "CA State Jobs — Student Assistant", url: "https://jobs.ca.gov", badge: "CA State", color: "bg-emerald-100 text-emerald-700" },
                      { label: "NSF REU Site Finder", url: "https://www.nsf.gov/crssprgm/reu/reu_search.jsp", badge: "Research", color: "bg-violet-100 text-violet-700" },
                      { label: "Idealist — Nonprofit Internships", url: "https://www.idealist.org", badge: "Nonprofit", color: "bg-rose-100 text-rose-700" },
                      { label: "CalNonprofits Job Board", url: "https://calnonprofits.org/resources/jobs", badge: "CA Nonprofit", color: "bg-rose-100 text-rose-700" },
                      { label: "CCURI — CC Research Programs", url: "https://www.ccuri.org", badge: "Research", color: "bg-violet-100 text-violet-700" },
                    ].map(({ label, url, badge, color }) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium hover:bg-white hover:border-slate-300 transition group">
                        <span className="truncate">{label}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", color)}>{badge}</span>
                          <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 transition" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 text-center py-8">
          DYP Internship Finder · Matches generated by AI based on your profile · Always verify deadlines and eligibility directly with the program
        </p>
      </main>
    </div>
  );
}
