import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, FileSpreadsheet, Presentation, Loader2, Download, CheckCircle2, AlertCircle } from "lucide-react";

interface ExportPreview {
  profile: { fullName: string | null; communityCollege: string | null; intendedMajor: string | null; currentGpa: number | null };
  counts: {
    courses: number;
    savedInternships: number;
    progressEntries: number;
    igetcCompleted: number;
    igetcTotal: number;
    completedUnits: number;
    upcomingDeadlines: number;
  };
  hasSelectedPathway: boolean;
  rateLimit: { perHour: number };
}

type ExportKey = "resume" | "transfer-plan" | "counselor-deck";

interface ExportSpec {
  key: ExportKey;
  title: string;
  description: string;
  icon: React.ElementType;
  endpoint: string;
  filename: (name: string) => string;
  ext: string;
  contents: string[];
}

const EXPORTS: ExportSpec[] = [
  {
    key: "resume",
    title: "Transfer Application Resume",
    description: "One-page PDF formatted for UC/CSU transfer applications. Pulls from your profile, courses, IGETC progress, saved internships, and progress log.",
    icon: FileText,
    endpoint: "resume",
    filename: (n) => `${n}_resume.pdf`,
    ext: "pdf",
    contents: ["Education + GPA", "Coursework highlights", "IGETC progress", "Activities & internships", "Interests"],
  },
  {
    key: "transfer-plan",
    title: "Transfer Plan Workbook",
    description: "Multi-tab Excel workbook covering your courses, IGETC pattern, deadlines, saved internships, and full progress log.",
    icon: FileSpreadsheet,
    endpoint: "transfer-plan",
    filename: (n) => `${n}_transfer_plan.xlsx`,
    ext: "xlsx",
    contents: ["Profile", "Courses", "IGETC Progress", "Deadlines", "Saved Internships", "Progress Log"],
  },
  {
    key: "counselor-deck",
    title: "Counselor Briefing Deck",
    description: "5-slide PowerPoint your counselor can flip through in an advising session — profile snapshot, pathway, GPA/IGETC, next deadlines, and your asks.",
    icon: Presentation,
    endpoint: "counselor-deck",
    filename: (n) => `${n}_counselor_brief.pptx`,
    ext: "pptx",
    contents: ["Profile snapshot", "Selected pathway", "GPA & IGETC", "Next deadlines", "Asks for counselor"],
  },
];

function sanitize(name: string): string {
  return (name || "student").trim().replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 60) || "student";
}

export default function ExportsPage() {
  const { profileId: paramId } = useParams<{ profileId?: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [profileId, setProfileId] = useState<number | null>(paramId ? parseInt(paramId) : null);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<ExportKey, boolean>>({ "resume": false, "transfer-plan": false, "counselor-deck": false });
  const [done, setDone] = useState<Record<ExportKey, boolean>>({ "resume": false, "transfer-plan": false, "counselor-deck": false });

  useEffect(() => {
    if (profileId) return;
    if (!user?.id) return;
    fetch(`/api/profiles/user/${user.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((profiles: { id: number }[]) => {
        if (profiles.length > 0) setProfileId(profiles[0].id);
        else { setLoading(false); navigate("/profile"); }
      })
      .catch(() => setLoading(false));
  }, [user?.id, profileId, navigate]);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    fetch(`/api/profiles/${profileId}/exports`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data: ExportPreview) => setPreview(data))
      .catch(() => toast({ title: "Couldn't load export hub", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [profileId, toast]);

  const handleGenerate = async (spec: ExportSpec) => {
    if (!profileId || !preview) return;
    setBusy((b) => ({ ...b, [spec.key]: true }));
    setDone((d) => ({ ...d, [spec.key]: false }));
    try {
      const r = await fetch(`/api/profiles/${profileId}/exports/${spec.endpoint}`, {
        method: "POST",
        credentials: "include",
      });
      if (r.status === 429) {
        const body = await r.json().catch(() => ({ error: "Rate limit reached" }));
        toast({ title: "Slow down a sec", description: body.error ?? "Too many exports just now.", variant: "destructive" });
        return;
      }
      if (!r.ok) {
        const body = await r.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(body.error ?? "Generation failed");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = spec.filename(sanitize(preview.profile.fullName ?? "student"));
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone((d) => ({ ...d, [spec.key]: true }));
      toast({ title: `${spec.title} downloaded`, description: "Check your Downloads folder." });
    } catch (err) {
      toast({
        title: "Couldn't generate that export",
        description: err instanceof Error ? err.message : "Something went wrong. Try again in a minute.",
        variant: "destructive",
      });
    } finally {
      setBusy((b) => ({ ...b, [spec.key]: false }));
    }
  };

  if (loading) {
    return (
      <PageShell title="Exports" profileId={profileId ?? undefined}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </PageShell>
    );
  }

  if (!preview || !profileId) {
    return (
      <PageShell title="Exports" profileId={profileId ?? undefined}>
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-slate-400" />
            Complete your profile first to unlock exports.
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const stats = [
    { label: "Courses logged", value: preview.counts.courses },
    { label: "Completed units", value: preview.counts.completedUnits },
    { label: "IGETC areas", value: `${preview.counts.igetcCompleted} / ${preview.counts.igetcTotal}` },
    { label: "Saved internships", value: preview.counts.savedInternships },
    { label: "Progress entries", value: preview.counts.progressEntries },
    { label: "Tracked deadlines", value: preview.counts.upcomingDeadlines },
  ];

  return (
    <PageShell
      title="Export Hub"
      subtitle="Bundle your Pathwise data into shareable artifacts for admissions, counselors, and yourself."
      profileId={profileId}
      maxWidth="wide"
    >
      <Card className="mb-6 border-slate-900 border-2 rounded-none">
        <CardHeader>
          <CardTitle className="text-base">What's getting bundled</CardTitle>
          <CardDescription>
            All exports use only your owned profile data. Limit: {preview.rateLimit.perHour} exports per hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="border border-slate-200 rounded-lg p-3 bg-white">
                <p className="text-xs text-slate-500 uppercase tracking-wide pwc-font-mono">{s.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>
          {!preview.hasSelectedPathway && (
            <p className="text-xs text-amber-700 mt-4 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              No pathway selected yet — the counselor deck will note this and recommend one.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {EXPORTS.map((spec) => {
          const Icon = spec.icon;
          const isBusy = busy[spec.key];
          const isDone = done[spec.key];
          return (
            <Card key={spec.key} className="border-2 border-slate-900 rounded-none flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="pwc-font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                    .{spec.ext}
                  </span>
                </div>
                <CardTitle className="text-base mt-3">{spec.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{spec.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-xs text-slate-500 uppercase tracking-wide pwc-font-mono mb-2">Contents</p>
                <ul className="space-y-1 mb-5 flex-1">
                  {spec.contents.map((c) => (
                    <li key={c} className="text-sm text-slate-700 flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleGenerate(spec)}
                  disabled={isBusy}
                  className="w-full bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none gap-2"
                >
                  {isBusy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  ) : isDone ? (
                    <><CheckCircle2 className="h-4 w-4" /> Generate again</>
                  ) : (
                    <><Download className="h-4 w-4" /> Generate &amp; download</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 text-center mt-8">
        Exports are generated on demand and never stored. Always verify deadlines and IGETC fulfillment with your counselor.
      </p>
    </PageShell>
  );
}
