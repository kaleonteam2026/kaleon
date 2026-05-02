import { useEffect, useState } from "react";
import { useParams } from "wouter";
import Nav from "@/components/nav";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Search, Award, Briefcase, GraduationCap, BookOpen, Star } from "lucide-react";
import { cn } from "@/lib/utils";

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

const OPP_ICONS: Record<string, React.ElementType> = {
  internship: Briefcase,
  research: BookOpen,
  honors_program: GraduationCap,
  career_prep: Star,
  apprenticeship: Briefcase,
  campus_org: GraduationCap,
  leadership_program: Star,
};

const OPP_COLORS: Record<string, string> = {
  internship: "bg-blue-100 text-blue-700",
  research: "bg-purple-100 text-purple-700",
  honors_program: "bg-amber-100 text-amber-700",
  career_prep: "bg-emerald-100 text-emerald-700",
  apprenticeship: "bg-orange-100 text-orange-700",
  campus_org: "bg-rose-100 text-rose-700",
  leadership_program: "bg-indigo-100 text-indigo-700",
};

export default function Scholarships() {
  const { profileId } = useParams<{ profileId?: string }>();
  const { toast } = useToast();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"scholarships" | "opportunities">("scholarships");

  const pid = profileId ? parseInt(profileId) : null;

  useEffect(() => {
    const scholarshipUrl = pid
      ? `/api/profiles/${pid}/recommended-scholarships`
      : "/api/scholarships";
    const scholarshipMethod = pid ? "POST" : "GET";

    const opportunityUrl = pid
      ? `/api/profiles/${pid}/recommended-opportunities`
      : "/api/opportunities";
    const opportunityMethod = pid ? "POST" : "GET";

    Promise.all([
      fetch(scholarshipUrl, { method: scholarshipMethod, credentials: "include" }).then(r => r.json()),
      fetch(opportunityUrl, { method: opportunityMethod, credentials: "include" }).then(r => r.json()),
    ])
      .then(([s, o]: [Scholarship[], Opportunity[]]) => {
        setScholarships(s);
        setOpportunities(o);
      })
      .catch(() => toast({ title: "Error loading data", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [pid]);

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
            <Briefcase className="inline h-3.5 w-3.5 mr-1" />
            Opportunities ({filteredOpportunities.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={tab === "scholarships" ? "Search scholarships…" : "Search opportunities…"}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {tab === "scholarships" && (
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
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-500 hover:text-indigo-700 flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tab === "opportunities" && (
          <div className="space-y-3 pb-12">
            {filteredOpportunities.map(o => {
              const Icon = OPP_ICONS[o.type] ?? Star;
              const colorClass = OPP_COLORS[o.type] ?? "bg-slate-100 text-slate-600";
              return (
                <Card key={o.id} className="hover:border-indigo-200 hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{o.name}</h3>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", colorClass)}>
                            <Icon className="h-3 w-3" />
                            {o.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{o.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {o.eligibilityTags.slice(0, 5).map(tag => (
                            <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <a
                        href={o.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-500 hover:text-indigo-700 flex-shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-xs text-slate-400 text-center pb-8">
          Scholarship and opportunity data is estimated as of early 2025. Always verify deadlines and requirements on official sites.
          Pathwise CC is not affiliated with any scholarship program.
        </p>
      </main>
    </div>
  );
}
