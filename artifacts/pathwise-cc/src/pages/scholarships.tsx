import { useEffect, useState } from "react";
import { useParams } from "wouter";
import Nav from "@/components/nav";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Search, Award, Briefcase, GraduationCap, BookOpen, Star, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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

interface University {
  id: string;
  name: string;
  system: string;
  location: string;
}

interface CampusOpportunityItem {
  name: string;
  type: string;
  description: string;
  admitProfileNote: string;
}

interface CampusOpportunitiesResult {
  university: string;
  summary: string;
  opportunities: CampusOpportunityItem[];
  admitProfileInsights: string[];
  sources: string[];
}

const OPP_ICONS: Record<string, React.ElementType> = {
  internship: Briefcase,
  research: BookOpen,
  honors_program: GraduationCap,
  career_prep: Star,
  apprenticeship: Briefcase,
  campus_org: GraduationCap,
  leadership_program: Star,
  club: GraduationCap,
  honor_society: Award,
  program: Star,
  leadership: Star,
  community: Star,
};

const OPP_COLORS: Record<string, string> = {
  internship: "bg-blue-100 text-blue-700",
  research: "bg-purple-100 text-purple-700",
  honors_program: "bg-amber-100 text-amber-700",
  honor_society: "bg-amber-100 text-amber-700",
  career_prep: "bg-emerald-100 text-emerald-700",
  apprenticeship: "bg-orange-100 text-orange-700",
  campus_org: "bg-rose-100 text-rose-700",
  leadership_program: "bg-indigo-100 text-indigo-700",
  club: "bg-rose-100 text-rose-700",
  program: "bg-teal-100 text-teal-700",
  leadership: "bg-indigo-100 text-indigo-700",
  community: "bg-green-100 text-green-700",
};

export default function Scholarships() {
  const { profileId } = useParams<{ profileId?: string }>();
  const { toast } = useToast();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"scholarships" | "opportunities">("scholarships");

  // University-specific opportunities state
  const [selectedUniId, setSelectedUniId] = useState<string>("");
  const [campusOpps, setCampusOpps] = useState<CampusOpportunitiesResult | null>(null);
  const [campusLoading, setCampusLoading] = useState(false);

  const pid = profileId ? parseInt(profileId) : null;

  useEffect(() => {
    const scholarshipUrl = pid ? `/api/profiles/${pid}/recommended-scholarships` : "/api/scholarships";
    const scholarshipMethod = pid ? "POST" : "GET";
    const opportunityUrl = pid ? `/api/profiles/${pid}/recommended-opportunities` : "/api/opportunities";
    const opportunityMethod = pid ? "POST" : "GET";

    Promise.all([
      fetch(scholarshipUrl, { method: scholarshipMethod, credentials: "include" }).then(r => r.json()),
      fetch(opportunityUrl, { method: opportunityMethod, credentials: "include" }).then(r => r.json()),
      fetch("/api/universities", { credentials: "include" }).then(r => r.json()),
    ])
      .then(([s, o, u]: [Scholarship[], Opportunity[], University[]]) => {
        setScholarships(s);
        setOpportunities(o);
        setUniversities(u);
      })
      .catch(() => toast({ title: "Error loading data", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [pid]);

  const loadCampusOpportunities = async (uniId: string) => {
    if (!uniId) return;
    setCampusLoading(true);
    setCampusOpps(null);
    try {
      const r = await fetch(`/api/universities/${uniId}/campus-opportunities`, { credentials: "include" });
      if (!r.ok) throw new Error();
      const data = await r.json() as CampusOpportunitiesResult;
      setCampusOpps(data);
    } catch {
      toast({ title: "Could not load campus opportunities", variant: "destructive" });
    } finally {
      setCampusLoading(false);
    }
  };

  const handleUniChange = (uniId: string) => {
    setSelectedUniId(uniId);
    void loadCampusOpportunities(uniId);
  };

  const filteredScholarships = scholarships.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOpportunities = opportunities.filter(o =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav profileId={pid ?? undefined} />
      <main className="pt-14 px-4 md:px-8 max-w-5xl mx-auto">
        <div className="py-8">
          <h1 className="text-2xl font-bold text-slate-900">Scholarships & Opportunities</h1>
          <p className="text-slate-500 text-sm mt-1">
            {pid ? "Personalized recommendations based on your profile." : "Browse all available scholarships and opportunities."}{" "}
            Always verify deadlines and requirements on official sites.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("scholarships")}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", tab === "scholarships" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600")}
          >
            <Award className="inline h-3.5 w-3.5 mr-1" />
            Scholarships ({filteredScholarships.length})
          </button>
          <button
            onClick={() => setTab("opportunities")}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", tab === "opportunities" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600")}
          >
            <Building2 className="inline h-3.5 w-3.5 mr-1" />
            Campus Opportunities
          </button>
        </div>

        {tab === "scholarships" && (
          <>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search scholarships…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
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
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">GPA {s.minGpa}+</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{s.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="font-semibold text-emerald-600">{s.amount}</span>
                          <span>Deadline: {s.deadline}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.eligibilityTags.slice(0, 5).map(tag => (
                            <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 flex-shrink-0">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {tab === "opportunities" && (
          <>
            {/* University selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Select a University</label>
                  <p className="text-xs text-slate-400">Pick a school to see specific campus clubs, research programs, internships, and extracurriculars — plus insights into what admitted students typically pursue.</p>
                  <Select value={selectedUniId} onValueChange={handleUniChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a university…" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {!selectedUniId && (
              <div className="text-center py-16">
                <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Select a university above to explore campus opportunities and admission insights.</p>
              </div>
            )}

            {campusLoading && (
              <div className="text-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Loading campus opportunities…</p>
                <p className="text-slate-400 text-sm mt-1">AI is compiling real programs and admission insights for this school.</p>
              </div>
            )}

            {campusOpps && !campusLoading && (
              <div className="space-y-6 pb-12">
                {/* Summary */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <h2 className="font-semibold text-indigo-900 mb-1">{campusOpps.university}</h2>
                  <p className="text-sm text-indigo-700">{campusOpps.summary}</p>
                </div>

                {/* Admit profile insights */}
                {campusOpps.admitProfileInsights && campusOpps.admitProfileInsights.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-amber-500" /> What Successful Students Typically Do
                    </h3>
                    <div className="space-y-2">
                      {campusOpps.admitProfileInsights.map((insight, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="text-amber-500 font-bold flex-shrink-0">•</span>
                          <span className="text-slate-600">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campus opportunities */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-indigo-500" /> Campus Programs & Opportunities
                  </h3>
                  <div className="space-y-3">
                    {campusOpps.opportunities.map((opp, i) => {
                      const Icon = OPP_ICONS[opp.type] ?? Star;
                      const colorClass = OPP_COLORS[opp.type] ?? "bg-slate-100 text-slate-600";
                      return (
                        <Card key={i} className="hover:border-indigo-200 hover:shadow-sm transition-all">
                          <CardContent className="p-4">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900">{opp.name}</h4>
                              <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", colorClass)}>
                                <Icon className="h-3 w-3" />
                                {opp.type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{opp.description}</p>
                            {opp.admitProfileNote && (
                              <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                                <strong>Admission insight:</strong> {opp.admitProfileNote}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Source links */}
                {campusOpps.sources && campusOpps.sources.length > 0 && (
                  <div className="text-xs text-slate-400">
                    <span className="font-medium">Suggested resources: </span>
                    {campusOpps.sources.join(", ")}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <p className="text-xs text-slate-400 text-center pb-8">
          Data is based on publicly available information as of early 2025. Always verify requirements on official university sites.
          Pathwise CC is not affiliated with any institution or scholarship program.
        </p>
      </main>
    </div>
  );
}
