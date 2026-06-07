import { useEffect, useState, useCallback } from "react";
import { useParams } from "wouter";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageMotion } from "@/components/page-motion";
import { motion } from "framer-motion";
import { fadeUp, useBrutalistMotion, DUR } from "@/lib/motion";
import {
  CheckCircle2, Circle, Sparkles, Loader2, Info, ExternalLink, Save,
  BookOpen, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { t } from "@/lib/copy";

// ─── IGETC Area definitions ───────────────────────────────────────────────────
interface IgetcSubArea {
  key: string;
  labelKey: string;
  required: boolean;
  noteKey?: string;
}
interface IgetcArea {
  key: string;
  labelKey: string;
  descKey: string;
  subAreas: IgetcSubArea[];
  required: boolean;
}

const IGETC_AREAS: IgetcArea[] = [
  {
    key: "area1", labelKey: "pages.igetc.area1_label", descKey: "pages.igetc.area1_desc",
    required: true,
    subAreas: [
      { key: "1a", labelKey: "pages.igetc.sub_1a", required: true },
      { key: "1b", labelKey: "pages.igetc.sub_1b", required: true },
      { key: "1c", labelKey: "pages.igetc.sub_1c", required: false, noteKey: "pages.igetc.sub_1c_note" },
    ],
  },
  {
    key: "area2", labelKey: "pages.igetc.area2_label", descKey: "pages.igetc.area2_desc",
    required: true,
    subAreas: [
      { key: "2", labelKey: "pages.igetc.sub_2", required: true },
    ],
  },
  {
    key: "area3", labelKey: "pages.igetc.area3_label", descKey: "pages.igetc.area3_desc",
    required: true,
    subAreas: [
      { key: "3a", labelKey: "pages.igetc.sub_3a", required: true },
      { key: "3b", labelKey: "pages.igetc.sub_3b", required: true },
    ],
  },
  {
    key: "area4", labelKey: "pages.igetc.area4_label", descKey: "pages.igetc.area4_desc",
    required: true,
    subAreas: [
      { key: "4", labelKey: "pages.igetc.sub_4", required: true },
    ],
  },
  {
    key: "area5", labelKey: "pages.igetc.area5_label", descKey: "pages.igetc.area5_desc",
    required: true,
    subAreas: [
      { key: "5a", labelKey: "pages.igetc.sub_5a", required: false },
      { key: "5b", labelKey: "pages.igetc.sub_5b", required: false },
      { key: "5c", labelKey: "pages.igetc.sub_5c", required: true, noteKey: "pages.igetc.sub_5c_note" },
    ],
  },
  {
    key: "area6", labelKey: "pages.igetc.area6_label", descKey: "pages.igetc.area6_desc",
    required: false,
    subAreas: [
      { key: "6", labelKey: "pages.igetc.sub_6", required: false, noteKey: "pages.igetc.sub_6_note" },
    ],
  },
  {
    key: "area7", labelKey: "pages.igetc.area7_label", descKey: "pages.igetc.area7_desc",
    required: false,
    subAreas: [
      { key: "7", labelKey: "pages.igetc.sub_7", required: false, noteKey: "pages.igetc.sub_7_note" },
    ],
  },
];

const ALL_KEYS = IGETC_AREAS.flatMap(a => a.subAreas.map(s => s.key));
const REQUIRED_KEYS = ["1a", "1b", "2", "3a", "3b", "4", "5c"];

function completionPercent(areas: Record<string, boolean>): number {
  const done = REQUIRED_KEYS.filter(k => areas[k]).length;
  return Math.round((done / REQUIRED_KEYS.length) * 100);
}

export default function IgetcTracker() {
  const { enabled: igMotionOn, lift: igLift, itemVariants, containerVariants } = useBrutalistMotion();
  const { profileId } = useParams<{ profileId: string }>();
  const pid = parseInt(profileId);
  const { toast } = useToast();

  const [areas, setAreas] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/profiles/${pid}/igetc`, { credentials: "include" });
      if (!r.ok) { setAreas({}); return; }
      const data = await r.json() as { areas: Record<string, boolean> };
      setAreas(data.areas ?? {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [pid]);

  useEffect(() => { void load(); }, [load]);

  const toggle = (key: string) => {
    setAreas(prev => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/profiles/${pid}/igetc`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areas }),
      });
      if (!res.ok) throw new Error("Save failed");
      setDirty(false);
      toast({ title: t("pages.igetc.savedToast") });
    } catch {
      toast({ title: t("pages.igetc.saveFailed"), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const r = await fetch(`/api/profiles/${pid}/igetc/analyze`, { method: "POST", credentials: "include" });
      if (!r.ok) { throw new Error("Analysis failed"); }
      const data = await r.json() as { areas: Record<string, boolean>; note?: string };
      setAreas(prev => {
        const merged = { ...prev };
        for (const k of ALL_KEYS) {
          if (data.areas[k] === true) merged[k] = true;
        }
        return merged;
      });
      setDirty(true);
      toast({ title: t("pages.igetc.analysisComplete"), description: t("pages.igetc.analysisDescription") });
    } catch {
      toast({ title: t("pages.igetc.analysisFailed"), variant: "destructive" });
    } finally { setAnalyzing(false); }
  };

  const pct = completionPercent(areas);
  const doneRequired = REQUIRED_KEYS.filter(k => areas[k]).length;

  if (loading) return <PageLoadingState />;

  return (
    <AppPageLayout profileId={pid} maxWidth="3xl">
        {/* Header */}
        <div className="py-7">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">{t("pages.igetc.title")}</h1>
          </div>
          <p className="text-slate-500 text-sm max-w-xl">
            {t("pages.igetc.intro")}
          </p>
        </div>

        <PageMotion>
        {/* Progress bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-slate-800">{t("pages.igetc.completion")}</p>
              <p className="text-xs text-slate-500">{t("pages.igetc.requiredAreasComplete", { count: doneRequired, total: REQUIRED_KEYS.length })}</p>
            </div>
            <div className="text-3xl font-bold text-indigo-600">{pct}%</div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", pct === 100 ? "bg-emerald-500" : "bg-indigo-500")}
              style={{ width: `${pct}%` }} />
          </div>
          {pct === 100 && (
            <p className="text-xs text-emerald-700 font-bold mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />{t("pages.igetc.allComplete")}
            </p>
          )}
        </div>

        {/* AI + Save bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={analyze} disabled={analyzing} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("pages.igetc.analyzing")}</> : <><Sparkles className="h-4 w-4 mr-2" />{t("pages.igetc.aiAnalyze")}</>}
          </Button>
          {dirty && (
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("pages.igetc.saving")}</> : <><Save className="h-4 w-4 mr-2" />{t("pages.igetc.saveProgress")}</>}
            </Button>
          )}
        </div>

        {/* Areas */}
        <motion.div
          className="space-y-3 mb-8"
          initial={igMotionOn ? "hidden" : false}
          whileInView={igMotionOn ? "show" : undefined}
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          {IGETC_AREAS.map(area => {
            const allDone = area.subAreas.filter(s => s.required).every(s => areas[s.key]);
            const isOpen = expanded[area.key] !== false;
            return (
              <motion.div
                key={area.key}
                variants={itemVariants ?? fadeUp(6, DUR.base)}
                whileHover={igMotionOn ? igLift : undefined}
                className={cn("bg-white border rounded-2xl overflow-hidden", allDone ? "border-emerald-200" : "border-slate-200")}
              >
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [area.key]: !isOpen }))}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    {allDone
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      : <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t(area.labelKey)}</p>
                      <p className="text-xs text-slate-500">{t(area.descKey)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!area.required && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">{t("pages.igetc.optional")}</span>}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3 space-y-2.5">
                    {area.subAreas.map(sub => (
                      <label key={sub.key} className={cn(
                        "flex items-start gap-3 cursor-pointer p-2.5 rounded-xl transition",
                        areas[sub.key] ? "bg-emerald-50" : "hover:bg-slate-50"
                      )}>
                        <button
                          onClick={() => toggle(sub.key)}
                          className={cn("w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition",
                            areas[sub.key] ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                          )}>
                          {areas[sub.key] && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </button>
                        <div>
                          <p className={cn("text-sm font-medium", areas[sub.key] ? "text-emerald-700 line-through" : "text-slate-800")}>{t(sub.labelKey)}</p>
                          {sub.noteKey && <p className="text-xs text-slate-500 mt-0.5">{t(sub.noteKey)}</p>}
                          {!sub.required && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">{t("pages.igetc.optional")}</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Resources */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-slate-800 mb-3">{t("pages.igetc.verifyTitle")}</p>
          <div className="space-y-2">
            {[
              { labelKey: "pages.igetc.resource_assist_label", url: "https://assist.org", descKey: "pages.igetc.resource_assist_desc" },
              { labelKey: "pages.igetc.resource_uc_label", url: "https://admission.universityofcalifornia.edu/admission-requirements/transfer-requirements/uc-transferable-courses.html", descKey: "pages.igetc.resource_uc_desc" },
              { labelKey: "pages.igetc.resource_csu_label", url: "https://www.calstate.edu/apply/transfer/pages/csu-ge-igetc.aspx", descKey: "pages.igetc.resource_csu_desc" },
            ].map(r => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-indigo-200 hover:bg-indigo-50 transition group">
                <div>
                  <p className="font-semibold text-slate-800">{t(r.labelKey)}</p>
                  <p className="text-slate-400">{t(r.descKey)}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            {t("pages.igetc.footerWarning")}
          </p>
        </div>
        </PageMotion>
    </AppPageLayout>
  );
}
