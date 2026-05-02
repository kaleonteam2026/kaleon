import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Target, AlertTriangle, CheckCircle, ArrowRight,
  ChevronDown, ChevronUp, Sparkles, BookOpen, Award, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  least_compatible:    { label: "Stretch", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
  moderately_compatible: { label: "Match", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  most_compatible:    { label: "Safety", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
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
      toast({ title: "Pathways generated!", description: "Your AI pathway reports are ready." });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav profileId={pid} />
      <main className="pt-14 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="py-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Pathway Reports</h1>
            <p className="text-slate-500 text-sm mt-1">
              Claude AI analyzes your profile to generate 3 personalized transfer pathway reports.
            </p>
          </div>
          <Button
            onClick={generatePathways}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />{pathways.length > 0 ? "Regenerate" : "Generate Pathways"}</>
            )}
          </Button>
        </div>

        {generating && (
          <div className="text-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Generating your pathways…</h2>
            <p className="text-slate-500 text-sm mt-1">Claude AI is analyzing your profile, courses, and goals. This takes 15–30 seconds.</p>
          </div>
        )}

        {!generating && pathways.length === 0 && (
          <div className="text-center py-16">
            <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-800">No pathways yet</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              Click "Generate Pathways" to have Claude AI create 3 personalized transfer pathway reports based on your profile.
            </p>
            <Button onClick={generatePathways} className="mt-6 bg-indigo-600 hover:bg-indigo-700">
              <Sparkles className="mr-2 h-4 w-4" /> Generate Pathways
            </Button>
          </div>
        )}

        {!generating && pathways.length > 0 && (
          <div className="space-y-4 pb-12">
            {/* Sort: stretch → match → safety */}
            {["least_compatible", "moderately_compatible", "most_compatible"].map(type => {
              const pathway = pathways.find(p => p.pathwayType === type);
              if (!pathway) return null;
              const report = pathway.reportJson;
              const meta = TYPE_LABELS[type] ?? { label: type, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
              const isExpanded = expanded === pathway.id;
              const isSelected = pathway.isSelected === "true";

              return (
                <Card key={pathway.id} className={cn("transition-all", isSelected ? "ring-2 ring-indigo-500" : "")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold", meta.bg, meta.color)}>
                            {meta.label} School
                          </span>
                          {isSelected && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Selected
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg">{report?.university ?? pathway.universityId}</CardTitle>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Compatibility: <strong>{report?.compatibilityScore ?? pathway.compatibilityScore}%</strong>
                          {report?.transferTimeline && (
                            <> · Target: <strong>{report.transferTimeline}</strong></>
                          )}
                          {report?.gpaTarget && (
                            <> · GPA target: <strong>{report.gpaTarget}</strong></>
                          )}
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
                    <CardContent className="space-y-4 pt-0 border-t border-slate-100">
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {/* Why it fits */}
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Why It Fits
                          </h4>
                          <p className="text-sm text-slate-600">{report.whyItFits}</p>
                        </div>

                        {/* Concerns */}
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
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Next Steps</h4>
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
                      className={isSelected ? "border-indigo-300 text-indigo-600" : "bg-indigo-600 hover:bg-indigo-700"}
                    >
                      {selecting === pathway.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                      {isSelected ? "Selected" : "Select Pathway"}
                    </Button>
                    {isSelected && (
                      <Button
                        size="sm"
                        onClick={() => generateGuidebook(pathway.id)}
                        disabled={generatingGuidebook === pathway.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {generatingGuidebook === pathway.id ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Generating Guidebook…</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5 mr-1" />Generate Guidebook</>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}

            {/* Disclaimer */}
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
