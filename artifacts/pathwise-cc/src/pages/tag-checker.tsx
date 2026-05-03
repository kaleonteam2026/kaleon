import { useEffect, useState } from "react";
import { useParams } from "wouter";
import Nav from "@/components/nav";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, XCircle, AlertCircle, ExternalLink, Info,
  GraduationCap, TrendingUp, CalendarDays, BookOpen,
} from "lucide-react";

interface Profile {
  id: number;
  fullName?: string;
  communityCollege?: string;
  intendedMajor?: string;
  currentGpa?: number;
  transferTimeline?: string;
}

interface TagCampus {
  id: string;
  name: string;
  system: "UC";
  minGpa: number;
  impactedMinGpa?: number;
  impactedNote?: string;
  excludedMajors: string[];
  url: string;
  notes: string[];
  color: string;
}

const TAG_CAMPUSES: TagCampus[] = [
  {
    id: "ucmerced",
    name: "UC Merced",
    system: "UC",
    minGpa: 2.4,
    excludedMajors: [],
    url: "https://admissions.ucmerced.edu/apply/transfer/tag",
    notes: ["Most accessible TAG — lowest GPA minimum of any UC", "All majors currently eligible", "Strong support for first-gen and low-income students"],
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    id: "ucdavis",
    name: "UC Davis",
    system: "UC",
    minGpa: 2.8,
    impactedMinGpa: 3.2,
    impactedNote: "Biological Sciences, Computer Science, Engineering require 3.2+",
    excludedMajors: ["Architecture", "Design"],
    url: "https://admissions.ucdavis.edu/transfer/tag",
    notes: ["Strong STEM programs", "Many majors eligible", "Verify your specific major's requirement"],
    color: "bg-blue-50 border-blue-200",
  },
  {
    id: "uci",
    name: "UC Irvine",
    system: "UC",
    minGpa: 2.8,
    impactedMinGpa: 3.4,
    impactedNote: "Computer Science, Business Economics, Nursing require 3.4+",
    excludedMajors: ["Music Performance"],
    url: "https://admissions.uci.edu/apply/transfer/transfer-admission-guarantee.php",
    notes: ["Highly competitive for CS and Business", "Check major-specific requirements carefully"],
    color: "bg-indigo-50 border-indigo-200",
  },
  {
    id: "ucr",
    name: "UC Riverside",
    system: "UC",
    minGpa: 2.8,
    impactedMinGpa: 3.0,
    impactedNote: "Business Administration, Computer Science, Engineering require 3.0+",
    excludedMajors: [],
    url: "https://admissions.ucr.edu/apply/transfer/transfer-admission-guarantee",
    notes: ["Diverse campus with strong equity programs", "First-gen student support programs", "R'Garden and food security resources"],
    color: "bg-amber-50 border-amber-200",
  },
  {
    id: "ucsb",
    name: "UC Santa Barbara",
    system: "UC",
    minGpa: 3.2,
    impactedMinGpa: 3.4,
    impactedNote: "Engineering, Computer Science require 3.4+; some majors require 3.6+",
    excludedMajors: ["Music", "Art"],
    url: "https://admissions.ucsb.edu/transfer/tag",
    notes: ["Higher GPA threshold than most TAG schools", "Beautiful campus with strong research", "Many majors have additional major-prep requirements"],
    color: "bg-rose-50 border-rose-200",
  },
  {
    id: "ucsc",
    name: "UC Santa Cruz",
    system: "UC",
    minGpa: 2.8,
    impactedMinGpa: 3.2,
    impactedNote: "Computer Science, Computer Engineering require 3.2+ and additional requirements",
    excludedMajors: ["Music Performance", "Theater Arts"],
    url: "https://admissions.ucsc.edu/apply/transfer/tag.html",
    notes: ["Known for environmental studies and CS programs", "TAG covers most STEM and humanities majors"],
    color: "bg-violet-50 border-violet-200",
  },
];

const ALL_REQUIREMENTS = [
  "Complete 60 semester / 90 quarter transferable units by end of spring before transfer",
  "Complete English composition (equivalent to IGETC Area 1A) with a C or better",
  "Complete a transferable math course with a C or better",
  "File your TAG application during the filing window: September 1–30",
  "Be in good academic standing (no dismissal/disqualification)",
  "Transfer the following fall semester (one year after filing)",
];

type EligibilityStatus = "eligible" | "close" | "ineligible" | "check_major";

function getStatus(gpa: number | undefined, campus: TagCampus, major: string | undefined): { status: EligibilityStatus; gpa: number; needed: number } {
  const g = gpa ?? 0;
  const needed = campus.minGpa;
  const impactedNeeded = campus.impactedMinGpa ?? needed;
  const majorLower = (major ?? "").toLowerCase();
  const isImpactedMajor = campus.impactedNote &&
    (majorLower.includes("computer") || majorLower.includes("engineering") || majorLower.includes("business") || majorLower.includes("nursing") || majorLower.includes("bio"));

  const effectiveNeeded = isImpactedMajor ? impactedNeeded : needed;

  if (g >= effectiveNeeded) return { status: "eligible", gpa: g, needed: effectiveNeeded };
  if (g >= effectiveNeeded - 0.3) return { status: "close", gpa: g, needed: effectiveNeeded };
  return { status: "ineligible", gpa: g, needed: effectiveNeeded };
}

function StatusIcon({ status }: { status: EligibilityStatus }) {
  if (status === "eligible") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === "close") return <AlertCircle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-slate-300" />;
}

function StatusBadge({ status, gpa, needed }: { status: EligibilityStatus; gpa: number; needed: number }) {
  const gap = needed - gpa;
  if (status === "eligible") return <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Eligible (GPA {gpa.toFixed(2)} ≥ {needed})</span>;
  if (status === "close") return <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Almost! Need +{gap.toFixed(2)} GPA</span>;
  return <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Need +{gap.toFixed(2)} GPA (need {needed}, have {gpa > 0 ? gpa.toFixed(2) : "none"})</span>;
}

export default function TagChecker() {
  const { profileId } = useParams<{ profileId?: string }>();
  const pid = profileId ? parseInt(profileId) : undefined;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pid) { setLoading(false); return; }
    fetch(`/api/profiles/${pid}`, { credentials: "include" })
      .then(r => r.json()).then((p: Profile) => setProfile(p))
      .catch(console.error).finally(() => setLoading(false));
  }, [pid]);

  const gpa = profile?.currentGpa ?? undefined;
  const major = profile?.intendedMajor ?? undefined;

  const eligibleCount = TAG_CAMPUSES.filter(c => getStatus(gpa, c, major).status === "eligible").length;
  const closeCount = TAG_CAMPUSES.filter(c => getStatus(gpa, c, major).status === "close").length;

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav profileId={pid} />
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none px-4 md:px-8 max-w-3xl mx-auto">
        <div className="py-7">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">TAG Eligibility Checker</h1>
          </div>
          <p className="text-slate-500 text-sm max-w-xl">
            Transfer Admission Guarantee (TAG) gives you a guaranteed admission letter from 6 UC campuses before you apply — if you meet the requirements.
          </p>
        </div>

        {/* Explainer */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />What is TAG?
          </p>
          <p className="text-sm text-indigo-800 leading-relaxed">
            TAG is a free agreement between California community colleges and 6 UC campuses. If you meet the GPA, unit, and major prep requirements and file during the September window, you receive a guaranteed admission offer before the main UC application opens in November.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-indigo-700 bg-indigo-100 rounded-xl px-3 py-2">
            <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
            <span><strong>Filing window: September 1–30</strong> each year (for the following fall transfer)</span>
          </div>
        </div>

        {/* Profile summary */}
        {loading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>
        ) : (
          <>
            {gpa ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">Your Profile</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span><span className="text-slate-500">GPA:</span> <strong className="text-indigo-700">{gpa.toFixed(2)}</strong></span>
                    {major && <span><span className="text-slate-500">Major:</span> <strong>{major}</strong></span>}
                    {profile?.communityCollege && <span><span className="text-slate-500">College:</span> <strong>{profile.communityCollege}</strong></span>}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{eligibleCount}</div>
                  <div className="text-xs text-slate-500">TAG eligible</div>
                  {closeCount > 0 && <div className="text-xs text-amber-600 mt-0.5">{closeCount} close</div>}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">Add your GPA to your profile to see personalized eligibility results. Showing general requirements below.</p>
              </div>
            )}

            {/* Campus cards */}
            <div className="space-y-4 mb-8">
              {TAG_CAMPUSES.map(campus => {
                const { status, needed } = getStatus(gpa, campus, major);
                return (
                  <div key={campus.id} className={cn("bg-white border rounded-2xl overflow-hidden", campus.color)}>
                    <div className={cn("px-4 py-3 flex items-center justify-between gap-3", campus.color)}>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={status} />
                        <h3 className="font-bold text-slate-900">{campus.name}</h3>
                      </div>
                      {gpa ? (
                        <StatusBadge status={status} gpa={gpa} needed={needed} />
                      ) : (
                        <span className="text-xs text-slate-500 bg-white/60 px-2 py-0.5 rounded-full">Min GPA: {campus.minGpa}</span>
                      )}
                    </div>
                    <div className="px-4 pb-4 pt-2">
                      {campus.impactedNote && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-2">
                          <strong>Note:</strong> {campus.impactedNote}
                        </p>
                      )}
                      <ul className="space-y-1 mb-3">
                        {campus.notes.map(n => (
                          <li key={n} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <TrendingUp className="h-3 w-3 text-indigo-400 flex-shrink-0 mt-0.5" />{n}
                          </li>
                        ))}
                      </ul>
                      <a href={campus.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                        Official TAG page <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Universal requirements */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />Universal TAG Requirements (all 6 campuses)
              </p>
              <ul className="space-y-2">
                {ALL_REQUIREMENTS.map(r => (
                  <li key={r} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />{r}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="https://admission.universityofcalifornia.edu/admission-requirements/transfer-requirements/transfer-admission-guarantee-tag.html"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
                  UC TAG overview <ExternalLink className="h-3 w-3" />
                </a>
                <a href="https://assist.org" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
                  ASSIST.org — Course articulation <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2">
              <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                TAG requirements change annually. Always verify current requirements at each campus's official TAG page and with your CC counselor. This checker uses general GPA thresholds — your specific major may have higher requirements.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
