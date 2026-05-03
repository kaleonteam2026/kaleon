import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation, Trans } from "react-i18next";
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
import { PageMotion } from "@/components/page-motion";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, useMotionEnabled, useDirSign, hoverLift, DUR } from "@/lib/motion";

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

const TYPE_LABELS: Record<string, { labelKey: string; color: string; bg: string }> = {
  least_compatible:      { labelKey: "pages.pathways.type_stretch", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
  moderately_compatible: { labelKey: "pages.pathways.type_match",   color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  most_compatible:       { labelKey: "pages.pathways.type_safety",  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
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
  const { t } = useTranslation();
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
  const pwMotionOn = useMotionEnabled();
  const pwDir = useDirSign();
  const pwLift = hoverLift(pwDir);

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
        toast({ title: t("pages.pathways.toast_rateLimit"), description: t("pages.pathways.toast_rateLimitDesc"), variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const p = await r.json() as Pathway[];
      setPathways(p);
      toast({ title: t("pages.pathways.toast_generated"), description: t("pages.pathways.toast_generatedDesc") });
    } catch {
      toast({ title: t("pages.pathways.toast_genError"), description: t("pages.pathways.toast_genErrorDesc"), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const selectPathway = async (pathwayId: number) => {
    setSelecting(pathwayId);
    try {
      await fetch(`/api/pathways/${pathwayId}/select`, { method: "POST", credentials: "include" });
      setPathways(prev => prev.map(p => ({ ...p, isSelected: p.id === pathwayId ? "true" : "false" })));
      toast({ title: t("pages.pathways.toast_selected") });
    } catch {
      toast({ title: t("pages.pathways.toast_selectError"), variant: "destructive" });
    } finally {
      setSelecting(null);
    }
  };

  const generateGuidebook = async (pathwayId: number) => {
    setGeneratingGuidebook(pathwayId);
    try {
      const r = await fetch(`/api/pathways/${pathwayId}/generate-guidebook`, { method: "POST", credentials: "include" });
      if (r.status === 429) {
        toast({ title: t("pages.pathways.toast_rateLimit"), variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const g = await r.json() as { id: number };
      toast({ title: t("pages.pathways.toast_guidebookReady"), description: t("pages.pathways.toast_guidebookReadyDesc") });
      navigate(`/guidebook/${g.id}`);
    } catch {
      toast({ title: t("pages.pathways.toast_guidebookError"), variant: "destructive" });
    } finally {
      setGeneratingGuidebook(null);
    }
  };

  const generateRoadmap = async (pathwayId: number) => {
    setGeneratingRoadmap(pathwayId);
    try {
      const r = await fetch(`/api/pathways/${pathwayId}/generate-roadmap`, { method: "POST", credentials: "include" });
      if (r.status === 429) {
        toast({ title: t("pages.pathways.toast_rateLimit"), description: t("pages.pathways.toast_roadmapRateDesc"), variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const roadmap = await r.json() as { id: number };
      toast({ title: t("pages.pathways.toast_roadmapReady"), description: t("pages.pathways.toast_roadmapReadyDesc") });
      navigate(`/roadmap/${roadmap.id}`);
    } catch {
      toast({ title: t("pages.pathways.toast_roadmapError"), variant: "destructive" });
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
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none px-4 md:px-6 max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b-2 border-slate-900 pb-4 mb-6 mt-4 md:mt-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">{t("pages.pathways.title")}</h1>
            <p className="text-slate-600 text-sm mt-1">
              <Trans i18nKey="pages.pathways.intro" components={{ strong: <strong /> }} />
            </p>
          </div>
          <Button
            onClick={generatePathways}
            disabled={generating}
            className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 pwc-font-mono uppercase tracking-wider text-xs font-bold rounded-none"
          >
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("pages.pathways.generating")}</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />{pathways.length > 0 ? t("pages.pathways.regenerate") : t("pages.pathways.generatePathways")}</>
            )}
          </Button>
        </header>

        <PageMotion>
        {generating && (
          <div className="text-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">{t("pages.pathways.generatingTitle")}</h2>
            <p className="text-slate-500 text-sm mt-1">{t("pages.pathways.generatingBody")}</p>
          </div>
        )}

        {!generating && pathways.length === 0 && (
          <div className="text-center py-16">
            <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-800">{t("pages.pathways.noPathwaysTitle")}</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              {t("pages.pathways.noPathwaysBody")}
            </p>
            <Button onClick={generatePathways} className="mt-6 bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
              <Sparkles className="mr-2 h-4 w-4" /> {t("pages.pathways.generatePathways")}
            </Button>
          </div>
        )}

        {!generating && pathways.length > 0 && (
          <motion.div
            className="space-y-4 pb-12"
            initial={pwMotionOn ? "hidden" : false}
            whileInView={pwMotionOn ? "show" : undefined}
            viewport={{ once: true, margin: "-50px" }}
            variants={pwMotionOn ? staggerContainer(0.06) : undefined}
          >
            {["least_compatible", "moderately_compatible", "most_compatible"].map(type => {
              const pathway = pathways.find(p => p.pathwayType === type);
              if (!pathway) return null;
              const report = pathway.reportJson;
              const meta = TYPE_LABELS[type] ?? { labelKey: type, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
              const isExpanded = expanded === pathway.id;
              const isSelected = pathway.isSelected === "true";

              return (
                <motion.div
                  key={pathway.id}
                  variants={pwMotionOn ? fadeUp(8, DUR.base) : undefined}
                  whileHover={pwMotionOn ? pwLift : undefined}
                >
                <Card className={cn(
                  "transition-all border-2 border-slate-900 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]",
                  isSelected && "ring-4 ring-slate-900 ring-offset-2"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold", meta.bg, meta.color)}>
                            {t(meta.labelKey)} {t("pages.pathways.schoolSuffix")}
                          </span>
                          {isSelected && (
                            <span className="text-xs bg-slate-900 text-white px-2 py-0.5 border-2 border-slate-900 flex items-center gap-1 pwc-font-mono uppercase tracking-wider font-bold">
                              <CheckCircle className="h-3 w-3" /> {t("pages.pathways.primaryBadge")}
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg">{report?.university ?? pathway.universityId}</CardTitle>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {t("pages.pathways.compatibility")} <strong>{report?.compatibilityScore ?? pathway.compatibilityScore}%</strong>
                          {report?.transferTimeline && <> · {t("pages.pathways.target")} <strong>{report.transferTimeline}</strong></>}
                          {report?.gpaTarget && <> · {t("pages.pathways.gpaTarget")} <strong>{report.gpaTarget}</strong></>}
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
                            <CheckCircle className="h-3.5 w-3.5" /> {t("pages.pathways.whyItFits")}
                          </h4>
                          <p className="text-sm text-slate-600">{report.whyItFits}</p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> {t("pages.pathways.concerns")}
                          </h4>
                          <p className="text-sm text-slate-600">{report.concerns}</p>
                        </div>
                      </div>

                      {/* Course gaps */}
                      {report.courseGaps && report.courseGaps.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-1">
                            <BookOpen className="h-3.5 w-3.5" /> {t("pages.pathways.courseGaps")}
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
                            {t("pages.pathways.campusOpps")}
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
                                      <strong>{t("pages.pathways.admitInsight")}</strong> {opp.admitProfileNote}
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
                            <Users className="h-3.5 w-3.5" /> {t("pages.pathways.extracurricular")}
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
                            <Award className="h-3.5 w-3.5" /> {t("pages.pathways.scholarships")}
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
                            <Briefcase className="h-3.5 w-3.5" /> {t("pages.pathways.internships")}
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
                            <AlertTriangle className="h-3.5 w-3.5" /> {t("pages.pathways.riskAlerts")}
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
                            <ArrowRight className="h-3.5 w-3.5 text-indigo-500" /> {t("pages.pathways.nextSteps")}
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
                      {isSelected ? t("pages.pathways.primaryPathway") : t("pages.pathways.makePrimary")}
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
                            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />{t("pages.pathways.generating")}</>
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5 mr-1" />{t("pages.pathways.generateGuidebook")}</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => generateRoadmap(pathway.id)}
                          disabled={generatingRoadmap === pathway.id || generatingGuidebook === pathway.id}
                          className="bg-violet-600 hover:bg-violet-700"
                        >
                          {generatingRoadmap === pathway.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />{t("pages.pathways.generating")}</>
                          ) : (
                            <><GraduationCap className="h-3.5 w-3.5 mr-1" />{t("pages.pathways.academicRoadmap")}</>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
                </motion.div>
              );
            })}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <Trans i18nKey="pages.pathways.disclaimer" components={{ strong: <strong /> }} />
            </div>
          </motion.div>
        )}
        </PageMotion>
      </main>
    </div>
  );
}
