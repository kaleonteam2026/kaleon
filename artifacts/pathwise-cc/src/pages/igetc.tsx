import { useEffect, useState, useCallback } from "react";
import { useParams } from "wouter";
import { useTranslation } from "react-i18next";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Circle, Sparkles, Loader2, Info, ExternalLink, Save,
  BookOpen, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── IGETC Area definitions ───────────────────────────────────────────────────
interface IgetcSubArea {
  key: string;
  label: string;
  required: boolean;
  note?: string;
}
interface IgetcArea {
  key: string;
  label: string;
  description: string;
  subAreas: IgetcSubArea[];
  required: boolean;
}

const IGETC_AREAS: IgetcArea[] = [
  {
    key: "area1", label: "Area 1 — English Communication", description: "Required for all UC and most CSU transfers.",
    required: true,
    subAreas: [
      { key: "1a", label: "1A: English Composition", required: true },
      { key: "1b", label: "1B: Critical Thinking & Composition", required: true },
      { key: "1c", label: "1C: Oral Communication (CSU only)", required: false, note: "Required for CSU; not required for UC IGETC" },
    ],
  },
  {
    key: "area2", label: "Area 2 — Mathematical Concepts & Quantitative Reasoning", description: "One course in college-level math with a C or better.",
    required: true,
    subAreas: [
      { key: "2", label: "Area 2: Math / Quantitative Reasoning", required: true },
    ],
  },
  {
    key: "area3", label: "Area 3 — Arts and Humanities", description: "At least one course from 3A and one from 3B (or two from one area).",
    required: true,
    subAreas: [
      { key: "3a", label: "3A: Arts", required: true },
      { key: "3b", label: "3B: Humanities", required: true },
    ],
  },
  {
    key: "area4", label: "Area 4 — Social and Behavioral Sciences", description: "At least one course required.",
    required: true,
    subAreas: [
      { key: "4", label: "Area 4: Social & Behavioral Sciences", required: true },
    ],
  },
  {
    key: "area5", label: "Area 5 — Physical and Biological Sciences", description: "Requires at least one Physical or Biological Science plus a lab.",
    required: true,
    subAreas: [
      { key: "5a", label: "5A: Physical Science", required: false },
      { key: "5b", label: "5B: Biological Science", required: false },
      { key: "5c", label: "5C: Laboratory Activity", required: true, note: "Must be combined with either 5A or 5B" },
    ],
  },
  {
    key: "area6", label: "Area 6 — Languages Other Than English", description: "Proficiency at 2nd-year college level or by exam. Waivable for many majors.",
    required: false,
    subAreas: [
      { key: "6", label: "Area 6: Language Other Than English", required: false, note: "May be waived — verify with your campus" },
    ],
  },
  {
    key: "area7", label: "Area 7 — CSU US History, Constitution & American Ideals", description: "CSU-only requirement. Not part of UC IGETC.",
    required: false,
    subAreas: [
      { key: "7", label: "Area 7: US History / Government (CSU only)", required: false, note: "CSU-only — not needed for UC transfers" },
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
  const { t } = useTranslation();
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
      await fetch(`/api/profiles/${pid}/igetc`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areas }),
      });
      setDirty(false);
      toast({ title: "IGETC progress saved!" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const r = await fetch(`/api/profiles/${pid}/igetc/analyze`, { method: "POST", credentials: "include" });
      const data = await r.json() as { areas: Record<string, boolean>; note?: string };
      if (data.note) { toast({ title: data.note }); setAnalyzing(false); return; }
      setAreas(prev => {
        const merged = { ...prev };
        for (const k of ALL_KEYS) {
          if (data.areas[k] === true) merged[k] = true;
        }
        return merged;
      });
      setDirty(true);
      toast({ title: "AI analysis complete! Review suggestions below.", description: "Areas marked in green may be satisfied by your courses. Verify with your counselor." });
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
    } finally { setAnalyzing(false); }
  };

  const pct = completionPercent(areas);
  const doneRequired = REQUIRED_KEYS.filter(k => areas[k]).length;

  if (loading) return (
    <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav profileId={pid} />
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none px-4 md:px-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="py-7">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">{t("pages.igetc.title")}</h1>
          </div>
          <p className="text-slate-500 text-sm max-w-xl">
            IGETC is a set of general education courses completed at your CC that satisfies GE requirements at all UC campuses (and most CSUs). Track your progress here.
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-slate-800">{t("pages.igetc.completion")}</p>
              <p className="text-xs text-slate-500">{doneRequired}/{REQUIRED_KEYS.length} required areas complete</p>
            </div>
            <div className="text-3xl font-bold text-indigo-600">{pct}%</div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", pct === 100 ? "bg-emerald-500" : "bg-indigo-500")}
              style={{ width: `${pct}%` }} />
          </div>
          {pct === 100 && (
            <p className="text-xs text-emerald-700 font-bold mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />All required IGETC areas complete! Verify with your CC counselor and ASSIST.org.
            </p>
          )}
        </div>

        {/* AI + Save bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={analyze} disabled={analyzing} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyzing courses…</> : <><Sparkles className="h-4 w-4 mr-2" />AI: Analyze My Courses</>}
          </Button>
          {dirty && (
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("pages.igetc.saving")}</> : <><Save className="h-4 w-4 mr-2" />{t("pages.igetc.saveProgress")}</>}
            </Button>
          )}
        </div>

        {/* Areas */}
        <div className="space-y-3 mb-8">
          {IGETC_AREAS.map(area => {
            const allDone = area.subAreas.filter(s => s.required).every(s => areas[s.key]);
            const isOpen = expanded[area.key] !== false;
            return (
              <div key={area.key} className={cn("bg-white border rounded-2xl overflow-hidden", allDone ? "border-emerald-200" : "border-slate-200")}>
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [area.key]: !isOpen }))}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    {allDone
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      : <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-bold text-slate-900">{area.label}</p>
                      <p className="text-xs text-slate-500">{area.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!area.required && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">Optional</span>}
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
                          <p className={cn("text-sm font-medium", areas[sub.key] ? "text-emerald-700 line-through" : "text-slate-800")}>{sub.label}</p>
                          {sub.note && <p className="text-xs text-slate-500 mt-0.5">{sub.note}</p>}
                          {!sub.required && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">Optional</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Resources */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-slate-800 mb-3">{t("pages.igetc.verifyTitle")}</p>
          <div className="space-y-2">
            {[
              { label: "ASSIST.org — Official Articulation Agreements", url: "https://assist.org", desc: "See which CC courses satisfy IGETC at your target UC/CSU" },
              { label: "UC IGETC Info", url: "https://admission.universityofcalifornia.edu/admission-requirements/transfer-requirements/uc-transferable-courses.html", desc: "Official UC IGETC overview" },
              { label: "CSU GE Breadth / IGETC", url: "https://www.calstate.edu/apply/transfer/pages/csu-ge-igetc.aspx", desc: "CSU-specific GE and IGETC info" },
            ].map(r => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-indigo-200 hover:bg-indigo-50 transition group">
                <div>
                  <p className="font-semibold text-slate-800">{r.label}</p>
                  <p className="text-slate-400">{r.desc}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            IGETC completion must be verified officially with your CC counselor and ASSIST.org. AI analysis is a suggestion based on course names only — not an official determination. Always get a certified IGETC completion form from your CC.
          </p>
        </div>
      </main>
    </div>
  );
}
