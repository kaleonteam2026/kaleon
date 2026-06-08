import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, GraduationCap, BookOpen, Target, Clock, CheckCircle2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { PathwaySnapshot } from "@/lib/supabase-pathways";
import type { Pathway } from "@/lib/supabase-pathways";

interface PathwayHistoryPanelProps {
  snapshots: PathwaySnapshot[];
  pathways: Pathway[];
  profileId: number;
}

const TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  least_compatible:      { label: "Stretch",   color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
  moderately_compatible: { label: "Match",     color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  most_compatible:       { label: "Safety",    color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
};

/** Format an ISO date string into a readable date. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PathwayHistoryPanel({ snapshots, pathways, profileId }: PathwayHistoryPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  /** Group all pathways by their generation label. */
  const pathwaysByLabel = new Map<string, Pathway[]>();
  for (const p of pathways) {
    const label = p.generationLabel ?? "Unknown";
    if (!pathwaysByLabel.has(label)) pathwaysByLabel.set(label, []);
    pathwaysByLabel.get(label)!.push(p);
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm">No pathway history yet.</p>
        <p className="text-slate-400 text-xs mt-1">Generate pathways to see your history here.</p>
        <Link href={`/pathways/${profileId}`}>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-sm">
            <Target className="h-4 w-4 mr-2" /> Go to Pathways
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {snapshots.length} generation{snapshots.length !== 1 ? "s" : ""} — click to expand
      </p>

      {snapshots.map((snapshot) => {
        const isOpen = expanded.has(snapshot.generationLabel);
        const labelPathways = pathwaysByLabel.get(snapshot.generationLabel) ?? [];

        return (
          <div
            key={snapshot.id}
            className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow"
          >
            {/* ── Collapsible header ───────────────────────────────────── */}
            <button
              onClick={() => toggle(snapshot.generationLabel)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{snapshot.generationLabel}</p>
                  <p className="text-xs text-slate-500">{formatDate(snapshot.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Quick stats pills */}
                <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600">
                  <span>{snapshot.totalUnits} units</span>
                  <span>{snapshot.courseCount} courses</span>
                  {snapshot.gpa != null && <span>GPA {snapshot.gpa.toFixed(2)}</span>}
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                )}
              </div>
            </button>

            {/* ── Expanded content ──────────────────────────────────────── */}
            {isOpen && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-5">
                {/* State-at-generation summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-lg font-bold text-slate-900">{snapshot.totalUnits}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Total Units</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-lg font-bold text-slate-900">{snapshot.completedUnits}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Completed</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-lg font-bold text-slate-900">{snapshot.courseCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Courses</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-200">
                    <div className={cn("text-lg font-bold", snapshot.gpa != null ? "text-indigo-600" : "text-slate-400")}>
                      {snapshot.gpa != null ? snapshot.gpa.toFixed(2) : "—"}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">GPA</div>
                  </div>
                </div>

                {/* Pathways from this generation */}
                {labelPathways.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No pathway details found for this generation.</p>
                )}

                {labelPathways.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      Pathways in this generation
                    </p>
                    {labelPathways.map((pathway) => {
                      const rj = pathway.reportJson;
                      const typeStyle = TYPE_STYLES[pathway.pathwayType ?? ""] ?? TYPE_STYLES.moderately_compatible;
                      return (
                        <div
                          key={pathway.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-white"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0">
                              <GraduationCap className="h-5 w-5 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {rj?.university ?? pathway.universityId ?? "Unknown"}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full border", typeStyle.bg, typeStyle.color, "border-current/30")}>
                                  {typeStyle.label}
                                </span>
                                <span className="text-xs text-slate-600">
                                  {pathway.compatibilityScore ?? rj?.compatibilityScore ?? "—"}% match
                                </span>
                                {rj?.gpaTarget != null && (
                                  <span className="text-xs text-slate-600">GPA {rj.gpaTarget.toFixed(1)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {rj?.requiredUnits != null && (
                              <span className="text-xs text-slate-500">{rj.requiredUnits} units</span>
                            )}
                            <Link href={`/pathways/${profileId}`}>
                              <Button variant="outline" size="sm" className="rounded-none border-slate-300 text-xs h-7">
                                <BookOpen className="h-3 w-3 mr-1" /> View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
