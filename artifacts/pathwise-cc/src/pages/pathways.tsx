import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Target, AlertTriangle, CheckCircle, ArrowRight,
  ChevronDown, ChevronUp, Sparkles, BookOpen, Award, Users, Briefcase,
  Star, GraduationCap, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CampusOpportunityItem {
  name: string;
  type: string;
  description: string;
  admitProfileNote: string;
}

interface PathwayReport {
  type: string;
  university: string;
  compatibilityScore: number;
  whyItFits: string;
  concerns: string;
  gpaTarget: number;
  courseGaps: string[];
  transferTimeline: string;
  scholarshipOptions: string[];
  internshipRecommendations: string[];
  extracurricularRecommendations: string[];
  campusOpportunities: CampusOpportunityItem[];
  risks: string[];
  nextSteps: string[];
}

interface Pathway {
  id: number;
  profileId: number;
  universityId?: string;
  compatibilityScore?: number;
  pathwayType?: string;
  reportJson?: PathwayReport;
  isSelected?: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  least_compatible:      { label: "Stretch", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
  moderately_compatible: { label: "Match",   color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  most_compatible:       { label: "Safety",  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
};

const OPP_ICONS: Record<string, React.ElementType> = {
  club: GraduationCap,
  research: BookOpen,
  internship: Briefcase,
  honor_society: Award,
  program: Star,
  leadership: Star,
  community: Users,
  honors_program: Award,
  career_prep: Briefcase,
};

const OPP_COLORS: Record<string, string> = {
  club: "bg-rose-100 text-rose-700",
  research: "bg-purple-100 text-purple-700",
  internship: "bg-blue-100 text-blue-700",
  honor_society: "bg-amber-100 text-amber-700",
  program: "bg-teal-100 text-teal-700",
  leadership: "bg-indigo-100 text-indigo-700",
  community: "bg-green-100 text-green-700",
  honors_program: "bg-amber-100 text-amber-700",
  career_prep: "bg-emerald-100 text-emerald-700",
};

export default function Pathways() {
  const { profileId } = useParams<{ profileId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [generatingGuidebook, setGeneratingGuidebook] = useState<number | null>(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState<number | null>(null);
  const pid = parseInt(profileId);

  const loadPathways = () => {
    fetch(`/api/profiles/${pid}/pathways`, { credentials: "include" })
      .then(r => r.json())
      .then((p: Pathway[]) => setPathways(p))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPathways(); }, [pid]);

  const generatePathways = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`/api/profiles/${pid}/generate-pathways`, { method: "POST", credentials: "include" });
      if (r.status === 429) {
        toast({ title: "Rate limit reached", description: "You can generate up to 5 pathway sets per hour.", variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const p = await r.json() as Pathway[];
      setPathways(p);
      toast({ title: "Pathways generated!", description: "Your personalized pathway reports are ready." });
    } catch {
      toast({ title: "Error generating pathways", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const selectPathway = async (pathwayId: number) => {
    setSelecting(pathwayId);
    try {
      await fetch(`/api/pathways/${pathwayId}/select`, { method: "POST", credentials: "include" });
      setPathways(prev => prev.map(p => ({ ...p, isSelected: p.id === pathwayId ? "true" : "false" })));
      toast({ title: "Pathway selected!" });
    } catch {
      toast({ title: "Error selecting pathway", variant: "destructive" });
    } finally {
      setSelecting(null);
    }
  };

  const generateGuidebook = async (pathwayId: number) => {
    setGeneratingGuidebook(pathwayId);
    try {
      const r = await fetch(`/api/pathways/${pathwayId}/generate-guidebook`, { method: "POST", credentials: "include" });
      if (r.status === 429) {
        toast({ title: "Rate limit reached", variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const g = await r.json() as { id: number };
      toast({ title: "Guidebook ready!", description: "Your personalized guidebook has been created." });
      navigate(`/guidebook/${g.id}`);
    } catch {
      toast({ title: "Error generating guidebook", variant: "destructive" });
    } finally {
      setGeneratingGuidebook(null);
    }
  };

  const generateRoadmap = async (pathwayId: number) => {
    setGeneratingRoadmap(pathwayId);
    try {
      const r = await fetch(`/api/pathways/${pathwayId}/generate-roadmap`, { method: "POST", credentials: "include" });
      if (r.status === 429) {
        toast({ title: "Rate limit reached", description: "You can generate up to 5 roadmaps per hour.", variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const roadmap = await r.json() as { id: number };
      toast({ title: "Academic Roadmap ready!", description: "Your full academic planner has been created." });
      navigate(`/roadmap/${roadmap.id}`);
    } catch {
      toast({ title: "Error generating roadmap", variant: "destructive" });
    } finally {
      setGeneratingRoadmap(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] pwc-font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `.pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }` }} />
      <Nav profileId={pid} />
      <main className="pt-14 pb-20 md:pb-8 px-4 md:px-6 max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b-2 border-slate-900 pb-4 mb-6 mt-4 md:mt-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">My Pathway</h1>
            <p className="text-slate-600 text-sm mt-1">
              AI generates 3 personalized transfer pathways — stretch, match, and safety schools. Pick one as your <strong>primary</strong>.
            </p>
          </div>
          <Button
            onClick={generatePathways}
            disabled={generating}
            className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 pwc-font-mono uppercase tracking-wider text-xs font-bold rounded-none"
          >
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />{pathways.length > 0 ? "Regenerate" : "Generate Pathways"}</>
            )}
          </Button>
        </header>

        {generating && (
          <div className="text-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Generating your pathways…</h2>
            <p className="text-slate-500 text-sm mt-1">AI is analyzing your profile, courses, and goals. This takes 15–30 seconds.</p>
          </div>
        )}

        {!generating && pathways.length === 0 && (
          <div className="text-center py-16">
            <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-800">No pathways yet</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              Click "Generate Pathways" to receive 3 personalized California transfer pathway reports — a stretch school, a match school, and a safety school — each with university on-site opportunities and next steps.
            </p>
            <Button onClick={generatePathways} className="mt-6 bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
              <Sparkles className="mr-2 h-4 w-4" /> Generate Pathways
            </Button>
          </div>
        )}

        {!generating && pathways.length > 0 && (
          <div className="space-y-4 pb-12">
            {["least_compatible", "moderately_compatible", "most_compatible"].map(type => {
              const pathway = pathways.find(p => p.pathwayType === type);
              if (!pathway) return null;
              const report = pathway.reportJson;
              const meta = TYPE_LABELS[type] ?? { label: type, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
              const isExpanded = expanded === pathway.id;
              const isSelected = pathway.isSelected === "true";

              return (
                <Card key={pathway.id} className={cn(
                  "transition-all border-2 border-slate-900 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]",
                  isSelected && "ring-4 ring-slate-900 ring-offset-2"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold", meta.bg, meta.color)}>
                            {meta.label} School
                          </span>
                          {isSelected && (
                            <span className="text-xs bg-slate-900 text-white px-2 py-0.5 border-2 border-slate-900 flex items-center gap-1 pwc-font-mono uppercase tracking-wider font-bold">
                              <CheckCircle className="h-3 w-3" /> Primary
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg">{report?.university ?? pathway.universityId}</CardTitle>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Compatibility: <strong>{report?.compatibilityScore ?? pathway.compatibilityScore}%</strong>
                          {report?.transferTimeline && <> · Target: <strong>{report.transferTimeline}</strong></>}
                          {report?.gpaTarget && <> · GPA target: <strong>{report.gpaTarget}</strong></>}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : pathway.id)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </CardHeader>

                  {isExpanded && report && (
                    <CardContent className="space-y-5 pt-0 border-t border-slate-100">

                      {/* Why it fits / Concerns */}
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Why It Fits
                          </h4>
                          <p className="text-sm text-slate-600">{report.whyItFits}</p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Concerns
                          </h4>
                          <p className="text-sm text-slate-600">{report.concerns}</p>
                        </div>
                      </div>

                      {/* Course gaps */}
                      {report.courseGaps && report.courseGaps.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-1">
                            <BookOpen className="h-3.5 w-3.5" /> Course Gaps to Address
                          </h4>
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {report.courseGaps.map((gap, i) => <li key={i}>• {gap}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* University On-Site Opportunities */}
                      {report.campusOpportunities && report.campusOpportunities.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                            University On-Site Opportunities
                          </h4>
                          <div className="space-y-2">
                            {report.campusOpportunities.map((opp, i) => {
                              const Icon = OPP_ICONS[opp.type] ?? Star;
                              const colorClass = OPP_COLORS[opp.type] ?? "bg-slate-100 text-slate-600";
                              return (
                                <div key={i} className="border border-slate-200 rounded-lg p-3 bg-white">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-slate-800">{opp.name}</span>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", colorClass)}>
                                      <Icon className="h-3 w-3" />
                                      {opp.type.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mb-1.5">{opp.description}</p>
                                  {opp.admitProfileNote && (
                                    <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-amber-800">
                                      <strong>Admit insight:</strong> {opp.admitProfileNote}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Extracurricular recommendations (text list fallback) */}
                      {(!report.campusOpportunities || report.campusOpportunities.length === 0) &&
                        report.extracurricularRecommendations && report.extracurricularRecommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-1">
                            <Users className="h-3.5 w-3.5" /> Extracurricular Recommendations
                          </h4>
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {report.extracurricularRecommendations.map((r, i) => <li key={i}>• {r}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Scholarships */}
                      {report.scholarshipOptions && report.scholarshipOptions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-1">
                            <Award className="h-3.5 w-3.5" /> Recommended Scholarships
                          </h4>
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {report.scholarshipOptions.map((s, i) => <li key={i}>• {s}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Internship recommendations */}
                      {report.internshipRecommendations && report.internshipRecommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-1">
                            <Briefcase className="h-3.5 w-3.5" /> Internship & Career Opportunities
                          </h4>
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {report.internshipRecommendations.map((r, i) => <li key={i}>• {r}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Risks */}
                      {report.risks && report.risks.length > 0 && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-rose-700 flex items-center gap-1 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Risk Alerts
                          </h4>
                          <ul className="text-sm text-rose-700 space-y-0.5">
                            {report.risks.map((risk, i) => <li key={i}>• {risk}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Next steps */}
                      {report.nextSteps && report.nextSteps.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                            <ArrowRight className="h-3.5 w-3.5 text-indigo-500" /> Next Steps
                          </h4>
                          <ol className="space-y-1">
                            {report.nextSteps.map((step, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <span className="text-indigo-500 font-bold flex-shrink-0">{i + 1}.</span>
                                <span className="text-slate-600">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </CardContent>
                  )}

                  {/* Action buttons */}
                  <div className="px-6 pb-4 flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={isSelected ? "outline" : "default"}
                      onClick={() => selectPathway(pathway.id)}
                      disabled={selecting === pathway.id || isSelected}
                      className={cn(
                        "border-2 rounded-none pwc-font-mono uppercase tracking-wider text-xs font-bold",
                        isSelected
                          ? "border-slate-900 text-slate-900 bg-white"
                          : "border-slate-900 bg-slate-900 hover:bg-slate-700 text-white"
                      )}
                    >
                      {selecting === pathway.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                      {isSelected ? "Primary Pathway" : "Make Primary"}
                    </Button>
                    {isSelected && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => generateGuidebook(pathway.id)}
                          disabled={generatingGuidebook === pathway.id || generatingRoadmap === pathway.id}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {generatingGuidebook === pathway.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Generating…</>
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5 mr-1" />Generate Guidebook</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => generateRoadmap(pathway.id)}
                          disabled={generatingRoadmap === pathway.id || generatingGuidebook === pathway.id}
                          className="bg-violet-600 hover:bg-violet-700"
                        >
                          {generatingRoadmap === pathway.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Generating…</>
                          ) : (
                            <><GraduationCap className="h-3.5 w-3.5 mr-1" />Academic Roadmap</>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <strong>Disclaimer:</strong> These pathway reports are AI-generated estimates using publicly available data from early 2025.
              They are not guarantees of admission, financial aid, or any other outcome. Always verify requirements with official sources
              and consult with your community college counselor before making transfer decisions.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
