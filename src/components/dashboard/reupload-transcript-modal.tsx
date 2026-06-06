import { useState, useRef } from "react";
import { X, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { extractTextFromPDF, parseTranscriptText } from "@/lib/parse-transcript";
import { createSnapshot, deleteAllSnapshots } from "@/lib/supabase-semesters";
import { isAuthBypass, saveDevSemesterSnapshot, deleteAllDevSemesterSnapshots } from "@/lib/dev-profile";
import { appendDevCourses } from "@/lib/dev-courses";
import { isSupabaseConfigured } from "@/lib/supabase";
import { GRADUATION_UNITS, type StoredCourse } from "@/lib/course-progress";
import { ParsingMessages } from "@/components/onboarding/parsing-messages";

interface ReuploadTranscriptModalProps {
  profileId: number;
  userId: string;
  onClose: () => void;
  onComplete: () => void;
}

type Status = "idle" | "parsing" | "saving" | "done" | "error";

export function ReuploadTranscriptModal({
  profileId,
  userId,
  onClose,
  onComplete,
}: ReuploadTranscriptModalProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    college: string;
    courses: { code: string; name: string; units?: number; term?: string }[];
    latestGpa: number | null;
    totalUnits: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bypass = isAuthBypass();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF transcript file.");
      return;
    }

    setStatus("parsing");
    setError(null);
    setResult(null);

    try {
      // 1. Extract text from PDF
      const text = await extractTextFromPDF(file);
      if (!text.trim()) {
        setError("Could not read any text from the PDF. Is it a valid transcript?");
        setStatus("error");
        return;
      }

      // 2. Parse the text (try API first, fallback to client-side)
      let courses: { code: string; name: string; units?: number; term?: string }[] = [];
      let latestGpa: number | null = null;
      let totalUnits = 0;

      try {
        const res = await fetch("/api/transcript/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const data = await res.json() as NonNullable<typeof result>;
          courses = data.courses;
          latestGpa = data.latestGpa;
          totalUnits = data.totalUnits;
        } else {
          throw new Error(`Server returned ${res.status}`);
        }
      } catch {
        // Fallback to client-side regex parser
        const fallback = parseTranscriptText(text);
        courses = fallback.courses.map((c) => ({ code: c.code, name: c.name, units: c.units, term: c.term }));
        latestGpa = fallback.latestGpa ?? null;
        totalUnits = fallback.totalUnits;
      }

      setResult({
        college: "Uploaded Transcript",
        courses,
        latestGpa,
        totalUnits,
      });
      setStatus("idle");
    } catch {
      setError("Failed to parse the transcript. Please try again.");
      setStatus("error");
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setStatus("saving");
    setError(null);

    try {
      // Detect term label from course terms
      const terms = result.courses
        .map((c) => c.term)
        .filter((t): t is string => Boolean(t && t.trim()));
      const termLabel = terms.length > 0
        ? terms.reduce((best, t) => {
            const freq = terms.filter((x) => x === t).length;
            return freq > (terms.filter((x) => x === best).length) ? t : best;
          }, terms[0])
        : "Transcript Upload";

      if (bypass) {
        // Delete old snapshots, save new one in localStorage
        deleteAllDevSemesterSnapshots(profileId);
        saveDevSemesterSnapshot(profileId, {
          user_id: userId,
          profile_id: profileId,
          term_label: termLabel,
          college: result.college,
          cumulative_gpa: result.latestGpa,
          cumulative_units: result.totalUnits,
          term_gpa: result.latestGpa,
          term_units: result.totalUnits,
          courses: result.courses.map((c) => ({
            course_code: c.code,
            course_name: c.name,
            units: c.units ?? null,
            grade: null,
          })),
        });
      } else if (isSupabaseConfigured) {
        await deleteAllSnapshots(profileId);
        await createSnapshot({
          user_id: userId,
          profile_id: profileId,
          term_label: termLabel,
          college: result.college,
          cumulative_gpa: result.latestGpa,
          cumulative_units: result.totalUnits,
          term_gpa: result.latestGpa,
          term_units: result.totalUnits,
          courses: result.courses.map((c) => ({
            course_code: c.code,
            course_name: c.name,
            units: c.units ?? null,
            grade: null,
          })),
        });
      }

      // Also save courses to the standalone courses table so the
      // courses page and dashboard course counts reflect them.
      const mappedCourses: Omit<StoredCourse, "id">[] = result.courses.map((c) => ({
        courseCode: c.code,
        courseName: c.name,
        units: c.units ?? undefined,
        term: c.term || undefined,
        status: "completed" as const,
      }));

      if (bypass) {
        appendDevCourses(profileId, mappedCourses);
      } else if (isSupabaseConfigured) {
        await fetch(`/api/profiles/${profileId}/courses/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latestGpa: result.latestGpa || undefined,
            courses: mappedCourses,
          }),
          credentials: "include",
        }).catch(() => {
          // non-fatal — snapshot already saved
        });
      }

      setStatus("done");
      setTimeout(() => {
        onComplete();
      }, 1200);
    } catch (e) {
      console.error("Failed to save re-uploaded transcript:", e);
      setError("Failed to save transcript data. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && status !== "saving") onClose(); }}
    >
      <div
        className="w-full max-w-md mx-4 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(13,26,46,0.98) 0%, rgba(6,16,32,0.99) 100%)",
          border: "1px solid rgba(78,204,163,0.25)",
          borderRadius: 12,
          boxShadow: "0 0 48px rgba(78,204,163,0.1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(78,204,163,0.15)" }}>
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "#f8fafc" }}>
            <Upload size={14} style={{ color: "#4ECCA3" }} />
            Re-upload Transcript
          </h2>
          <button
            onClick={onClose}
            disabled={status === "saving"}
            className="p-1 rounded transition-colors disabled:opacity-40"
            style={{ color: "#64748b" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#cbd5e1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {status === "done" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} style={{ color: "#4ECCA3" }} />
              <p className="text-sm font-medium" style={{ color: "#f8fafc" }}>Transcript Updated!</p>
              <p className="text-xs" style={{ color: "#64748b" }}>Your dashboard will refresh with the latest data.</p>
            </div>
          ) : status === "parsing" ? (
            <ParsingMessages visible title="Parsing transcript..." />
          ) : status === "saving" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4ECCA3" }} />
              <p className="text-sm" style={{ color: "#cbd5e1" }}>Saving transcript data...</p>
              <p className="text-xs" style={{ color: "#64748b" }}>Replacing your previous snapshot.</p>
            </div>
          ) : result ? (
            // Show parsed result summary
            <div className="space-y-4">
              <div className="p-3" style={{ background: "rgba(78,204,163,0.06)", borderRadius: 8, border: "1px solid rgba(78,204,163,0.15)" }}>
                <p className="text-xs pwc-font-mono uppercase tracking-wider font-bold mb-2" style={{ color: "#4ECCA3" }}>
                  Parsed Results
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[10px] pwc-font-mono block" style={{ color: "#64748b" }}>Courses</span>
                    <span style={{ color: "#f8fafc" }}>{result.courses.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] pwc-font-mono block" style={{ color: "#64748b" }}>GPA</span>
                    <span style={{ color: "#f8fafc" }}>{result.latestGpa?.toFixed(2) ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] pwc-font-mono block" style={{ color: "#64748b" }}>Total Units</span>
                    <span style={{ color: "#f8fafc" }}>{result.totalUnits}</span>
                  </div>
                  <div>
                    <span className="text-[10px] pwc-font-mono block" style={{ color: "#64748b" }}>Graduation</span>
                    <span style={{ color: "#f8fafc" }}>{Math.min(100, Math.round((result.totalUnits / GRADUATION_UNITS) * 100))}%</span>
                  </div>
                </div>
              </div>

              {/* Warning about replacing */}
              <div className="flex items-start gap-2 p-2.5" style={{ background: "rgba(251,191,36,0.08)", borderRadius: 8, border: "1px solid rgba(251,191,36,0.2)" }}>
                <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
                <p className="text-[11px]" style={{ color: "#a16207" }}>
                  This will replace your current transcript snapshot. Make sure this is your latest cumulative transcript.
                </p>
              </div>

              {error && (
                <p className="text-xs p-2" style={{ color: "#fca5a5", background: "rgba(239,68,68,0.08)", borderRadius: 6 }}>
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setResult(null); setError(null); setStatus("idle"); if (fileRef.current) fileRef.current.value = ""; }}
                  className="flex-1 px-3 py-2 text-xs pwc-font-mono uppercase tracking-wider font-bold"
                  style={{ border: "1px solid rgba(78,204,163,0.3)", borderRadius: 6, color: "#94a3b8", background: "transparent" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-3 py-2 text-xs pwc-font-mono uppercase tracking-wider font-bold"
                  style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18", borderRadius: 6 }}
                >
                  Save & Replace
                </button>
              </div>
            </div>
          ) : (
            // File upload area
            <div className="space-y-4">
              <div
                className="flex flex-col items-center gap-3 py-8 px-4 cursor-pointer transition-all"
                style={{ border: "2px dashed rgba(78,204,163,0.25)", borderRadius: 10, background: "rgba(78,204,163,0.03)" }}
                onClick={() => fileRef.current?.click()}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(78,204,163,0.5)"; (e.currentTarget as HTMLElement).style.background = "rgba(78,204,163,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(78,204,163,0.25)"; (e.currentTarget as HTMLElement).style.background = "rgba(78,204,163,0.03)"; }}
              >
                <FileText size={36} style={{ color: "#4ECCA3", opacity: 0.5 }} />
                <p className="text-sm font-medium" style={{ color: "#cbd5e1" }}>Upload your transcript PDF</p>
                <p className="text-xs" style={{ color: "#64748b" }}>Click to browse or drag a file here</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {error && (
                <p className="text-xs p-2" style={{ color: "#fca5a5", background: "rgba(239,68,68,0.08)", borderRadius: 6 }}>
                  {error}
                </p>
              )}

              <p className="text-[10px] text-center" style={{ color: "#475569" }}>
                Your transcript data is stored securely and only used to track your progress.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
