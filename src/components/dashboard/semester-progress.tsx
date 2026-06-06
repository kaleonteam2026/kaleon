import { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  BookOpen,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { isAuthBypass, getDevSemesterSnapshots } from "@/lib/dev-profile";
import { getSemesterSnapshots } from "@/lib/supabase-semesters";
import { isSupabaseConfigured } from "@/lib/supabase";
import { GRADUATION_UNITS } from "@/lib/course-progress";
import { ReuploadTranscriptModal } from "@/components/dashboard/reupload-transcript-modal";
import type { SemesterSnapshot, SnapshotCourse } from "@/types/semester";

// ─── Normalized display data ─────────────────────────────────────

interface SemesterDisplay {
  id: number;
  termLabel: string;
  college: string;
  termGpa: number | null;
  cumulativeGpa: number | null;
  termUnits: number | null;
  cumulativeUnits: number | null;
  courseCount: number;
}

function toDisplay(
  snapshots: (SemesterSnapshot & { courses: SnapshotCourse[] })[],
  dev: boolean,
): SemesterDisplay[] {
  if (!dev) {
    return snapshots.map((s) => ({
      id: s.id,
      termLabel: s.term_label,
      college: s.college,
      termGpa: s.term_gpa,
      cumulativeGpa: s.cumulative_gpa,
      termUnits: s.term_units,
      cumulativeUnits: s.cumulative_units,
      courseCount: s.course_count,
    }));
  }
  // Dev entries use profile_id instead of profile_id field
  return (snapshots as unknown as ReturnType<typeof getDevSemesterSnapshots>).map((s) => ({
    id: s.id,
    termLabel: s.term_label,
    college: s.college,
    termGpa: s.term_gpa,
    cumulativeGpa: s.cumulative_gpa,
    termUnits: s.term_units,
    cumulativeUnits: s.cumulative_units,
    courseCount: s.course_count,
  }));
}

// ─── GPA trend helpers ────────────────────────────────────────────

type GpaTrend = "up" | "down" | "flat" | "none";

function gpaTrend(current: number | null, previous: number | null): GpaTrend {
  if (current == null || previous == null) return "none";
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

function TrendIcon({ trend }: { trend: GpaTrend }) {
  if (trend === "up") return <TrendingUp size={12} className="text-[#4ECCA3]" />;
  if (trend === "down") return <TrendingDown size={12} className="text-[#ef4444]" />;
  if (trend === "flat") return <Minus size={12} className="text-[#f59e0b]" />;
  return null;
}

// ─── Component ────────────────────────────────────────────────────

interface SemesterProgressProps {
  profileId: number;
}

export function SemesterProgress({ profileId }: SemesterProgressProps) {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<SemesterDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReupload, setShowReupload] = useState(false);

  const bypass = isAuthBypass();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (bypass) {
          const devData = getDevSemesterSnapshots(profileId);
          if (!cancelled) setSnapshots(toDisplay(devData as any, true));
        } else if (isSupabaseConfigured && user?.id) {
          const data = await getSemesterSnapshots(profileId);
          if (!cancelled) setSnapshots(toDisplay(data, false));
        }
      } catch (e) {
        console.error("Failed to load semester snapshots:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [profileId, bypass, user?.id]);

  const latestCumulativeUnits = snapshots.length > 0
    ? snapshots[snapshots.length - 1].cumulativeUnits ?? 0
    : 0;
  const gradPercent = Math.min(100, Math.round((latestCumulativeUnits / GRADUATION_UNITS) * 100));

  const trends = useMemo(() => {
    return snapshots.map((s, i) => ({
      ...s,
      trend: i > 0 ? gpaTrend(s.cumulativeGpa, snapshots[i - 1].cumulativeGpa) : "none" as GpaTrend,
    }));
  }, [snapshots]);

  const refresh = async () => {
    setShowReupload(false);
    // Re-fetch snapshots
    setLoading(true);
    try {
      if (bypass) {
        const devData = getDevSemesterSnapshots(profileId);
        setSnapshots(toDisplay(devData as any, true));
      } else if (isSupabaseConfigured && user?.id) {
        const data = await getSemesterSnapshots(profileId);
        setSnapshots(toDisplay(data, false));
      }
    } catch (e) {
      console.error("Failed to refresh semester snapshots:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dash-card p-5">
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#4ECCA3" }} />
          <span className="text-xs pwc-font-mono" style={{ color: "#64748b" }}>Loading semesters...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dash-card overflow-hidden">
        {/* Header */}
        <div className="dash-card-header flex items-center justify-between">
          <h2 className="font-bold uppercase tracking-wider text-xs flex items-center gap-2" style={{ color: "#4ECCA3" }}>
            <GraduationCap size={14} /> Semester Progress
          </h2>
          <button
            onClick={() => setShowReupload(true)}
            className="flex items-center gap-1.5 text-[10px] pwc-font-mono uppercase tracking-wider font-bold px-2.5 py-1 transition-all"
            style={{ border: "1px solid rgba(78,204,163,0.3)", borderRadius: 6, color: "#4ECCA3", background: "transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(78,204,163,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Upload size={11} />
            Re-upload
          </button>
        </div>

        {trends.length === 0 ? (
          <div className="px-5 pb-5">
            <div
              className="flex flex-col items-center justify-center gap-2 py-6 text-center"
              style={{ border: "1px dashed rgba(78,204,163,0.2)", borderRadius: 8, background: "rgba(78,204,163,0.03)" }}
            >
              <GraduationCap size={24} style={{ color: "#4ECCA3", opacity: 0.4 }} />
              <p className="text-xs" style={{ color: "#64748b" }}>
                No transcript data yet
              </p>
              <p className="text-[10px] pwc-font-mono" style={{ color: "#475569" }}>
                Upload your transcript from onboarding or tap "Re-upload" above
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            {/* Cumulative progress bar */}
            <div>
              <div className="flex justify-between text-[10px] pwc-font-mono mb-1" style={{ color: "#64748b" }}>
                <span>Graduation Progress</span>
                <span>{latestCumulativeUnits} / {GRADUATION_UNITS} units</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(78,204,163,0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${gradPercent}%`, background: "linear-gradient(90deg, #4ECCA3, #38b2ac)" }}
                />
              </div>
              <div className="text-[10px] pwc-font-mono mt-1 text-right" style={{ color: gradPercent >= 100 ? "#4ECCA3" : "#475569" }}>
                {gradPercent}%
              </div>
            </div>

            {/* Semester timeline */}
            <div className="space-y-2">
              <div className="text-[10px] pwc-font-mono uppercase tracking-wider" style={{ color: "#475569" }}>
                Semester Timeline
              </div>
              {[...trends].reverse().map((s, index) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: "rgba(78,204,163,0.04)", border: "1px solid rgba(78,204,163,0.08)" }}
                >
                  {/* Term badge */}
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(78,204,163,0.1)", color: "#4ECCA3" }}
                  >
                    <GraduationCap size={14} />
                  </div>

                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "#cbd5e1" }}>{s.termLabel}</span>
                      <TrendIcon trend={s.trend} />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] pwc-font-mono" style={{ color: "#475569" }}>
                      {s.college && <span className="truncate max-w-[100px]">{s.college}</span>}
                      {s.college && <span>·</span>}
                      <span>{s.courseCount} course{s.courseCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* GPA + Units */}
                  <div className="text-right shrink-0">
                    {s.cumulativeGpa != null && (
                      <div className="text-sm pwc-font-mono font-bold" style={{ color: "#4ECCA3" }}>
                        {s.cumulativeGpa.toFixed(2)}
                      </div>
                    )}
                    <div className="text-[10px] pwc-font-mono" style={{ color: "#475569" }}>
                      {s.cumulativeUnits ?? "—"} units
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Re-upload Transcript Modal */}
      {showReupload && (
        <ReuploadTranscriptModal
          profileId={profileId}
          userId={user?.id ?? ""}
          onClose={() => setShowReupload(false)}
          onComplete={refresh}
        />
      )}
    </>
  );
}
