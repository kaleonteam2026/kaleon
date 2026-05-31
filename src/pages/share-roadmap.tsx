import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Download, FileText, Image as ImageIcon, AlertTriangle, GraduationCap } from "lucide-react";
import { PageLoadingState } from "@/components/page-loading-state";
import { Button } from "@/components/ui/button";
import { PageMotion } from "@/components/page-motion";

interface SharePreview {
  studentName: string;
  targetSchool: string;
  major: string;
  generatedAt: string;
  hasInfographic: boolean;
  pngUrl: string;
  pdfUrl: string;
  expiresAt: string;
}

export default function ShareRoadmap() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/share/roadmap/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setError(json.error ?? "This share link is no longer available.");
          return;
        }
        setData(json as SharePreview);
      })
      .catch(() => { if (!cancelled) setError("Could not reach the server. Please try again later."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const download = (url: string, ext: string) => {
    const a = document.createElement("a");
    a.href = `${url}?download=1`;
    a.download = `pathwise-roadmap.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (loading) {
    return <PageLoadingState message="Loading shared roadmap…" className="bg-slate-50" />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link unavailable</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error ?? "This share link is no longer available."}
          </p>
          <p className="text-xs text-slate-400 mt-4">
            If a student sent you this link, ask them to generate a new one from their roadmap page.
          </p>
        </div>
      </div>
    );
  }

  const generated = (() => {
    try {
      return new Date(data.generatedAt).toLocaleDateString(undefined, {
        month: "long", day: "numeric", year: "numeric",
      });
    } catch { return ""; }
  })();
  const expires = (() => {
    try {
      return new Date(data.expiresAt).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
      });
    } catch { return ""; }
  })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex items-center gap-3">
          <GraduationCap className="h-6 w-6" />
          <div>
            <p className="text-[11px] uppercase tracking-widest text-violet-100 font-semibold">Pathwise CC</p>
            <p className="text-sm text-violet-50">Shared academic roadmap</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6">
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{data.studentName}</h1>
          <p className="text-base text-slate-700 mt-1">→ {data.targetSchool}</p>
          <p className="text-sm text-slate-500 mt-1">{data.major}</p>
          {generated && (
            <p className="text-xs text-slate-400 mt-3">Roadmap generated {generated}</p>
          )}
        </section>

        <PageMotion>
        {data.hasInfographic ? (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-5">
            <div className="bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              One-page infographic
            </div>
            <div className="p-3 md:p-4">
              <img
                src={data.pngUrl}
                alt={`Academic roadmap for ${data.studentName}`}
                className="w-full h-auto rounded-md border border-slate-100"
                loading="eager"
              />
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
              <Button onClick={() => download(data.pngUrl, "png")} size="sm" variant="outline">
                <ImageIcon className="h-4 w-4 mr-2" /> Save image
              </Button>
              <Button onClick={() => download(data.pdfUrl, "pdf")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <FileText className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </div>
          </section>
        ) : (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Infographic not generated yet</p>
              <p className="text-xs text-amber-700 mt-1">
                Ask the student to open their roadmap and click "Generate infographic" — then this link will show their plan.
              </p>
            </div>
          </section>
        )}

        <section className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-500 leading-relaxed">
          <p className="mb-2">
            <span className="font-semibold text-slate-700">For counselors & supporters:</span>{" "}
            this is a one-page snapshot of a student's transfer plan. It is AI-generated and should always be verified
            against official college, IGETC, and university transfer requirements.
          </p>
          {expires && <p>This link expires on {expires}. Students can revoke it at any time.</p>}
          <p className="mt-2">Pathwise CC · Not a substitute for official academic advising.</p>
        </section>
        </PageMotion>
      </main>
    </div>
  );
}
