import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Download, Loader2, MapPin, AlertTriangle,
  CheckSquare, Square, CheckCircle2,
} from "lucide-react";
import { MarkdownContent } from "@/components/markdown-renderer";

interface AcademicRoadmap {
  id: number;
  title?: string;
  contentMarkdown?: string;
  profileId?: number;
  createdAt?: string;
}

export default function Roadmap() {
  const { roadmapId } = useParams<{ roadmapId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [roadmap, setRoadmap] = useState<AcademicRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setCurrentSection] = useState("");
  const rid = parseInt(roadmapId);

  useEffect(() => {
    fetch(`/api/roadmaps/${rid}`, { credentials: "include" })
      .then(r => r.json())
      .then((r: AcademicRoadmap) => setRoadmap(r))
      .catch(() => toast({ title: "Error loading roadmap", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [rid]);

  const downloadMarkdown = () => {
    if (!roadmap?.contentMarkdown) return;
    const blob = new Blob([roadmap.contentMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dyp-roadmap-${roadmap.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Roadmap downloaded!" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          <p className="text-sm text-slate-500">Loading your academic roadmap…</p>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Roadmap not found.</p>
          <Button variant="outline" onClick={() => navigate("/")} className="mt-4">Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav profileId={roadmap.profileId} />
      <main className="pt-14 px-4 md:px-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="py-6 flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Pathways
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full border border-violet-200">
                Academic Roadmap & Planner
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-tight">{roadmap.title ?? "Your Academic Roadmap"}</h1>
            {roadmap.createdAt && (
              <p className="text-xs text-slate-400 mt-1">
                Generated {new Date(roadmap.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <Button onClick={downloadMarkdown} variant="outline" size="sm" className="flex-shrink-0">
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            This roadmap is AI-generated and is <strong>not a substitute</strong> for official academic advising.
            Verify all requirements with your counselor and each university's official admissions page.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-5 mb-5 px-1 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Square className="h-3.5 w-3.5 text-slate-300" /> Pending</span>
          <span className="flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> Done</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Action step</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> Note</span>
        </div>

        {/* Content */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 md:px-10 py-8 mb-12">
          <MarkdownContent
            markdown={roadmap.contentMarkdown ?? "No content available."}
            setSection={setCurrentSection}
          />
        </div>

        {/* Footer */}
        <div className="text-center pb-12">
          <Button onClick={downloadMarkdown} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Download Roadmap
          </Button>
          <p className="text-xs text-slate-400 mt-3">DYP · AI-generated · Always verify with official sources</p>
        </div>
      </main>
    </div>
  );
}
