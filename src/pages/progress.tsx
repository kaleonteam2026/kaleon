import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/markdown-renderer";
import { cn } from "@/lib/utils";
import { PageMotion } from "@/components/page-motion";
import { motion } from "framer-motion";
import { fadeUp, useBrutalistMotion, DUR } from "@/lib/motion";
import {
  TrendingUp, Plus, Loader2, Download, AlertTriangle,
  GraduationCap, Award, CheckCircle2, Sparkles, Activity,
  BookOpen, Target, ArrowRight, BarChart3, Info, Calendar,
} from "lucide-react";
import { t } from "@/lib/copy";
import { useToast } from "@/hooks/use-toast";

import { PathwayLockScreen } from "@/components/progress/pathway-lock-screen";
import { PathwayHistoryPanel } from "@/components/progress/pathway-history-panel";
import { EntryFeedbackCard } from "@/components/progress/entry-feedback-card";
import { EntryCard } from "@/components/progress/entry-card";
import { AnalysisCard } from "@/components/progress/analysis-card";
import { ScoreRing } from "@/components/progress/score-ring";
import { ENTRY_TYPES } from "@/components/progress/entry-types-config";
import type { EntryType, ProgressEntry, EntryFeedback, ProgressAnalysis } from "@/components/progress/progress-types";

/** Local pathway data shape for the progress page. */
interface PathwayOverviewData {
  university?: string;
  pathwayType?: string;
  compatibilityScore?: unknown;
  gpaTarget?: unknown;
  requiredUnits?: unknown;
  courseGaps?: string[];
  risks?: string[];
  nextSteps?: string[];
}

interface PathwayInfo {
  hasSelectedPathway: boolean;
  pathway: PathwayOverviewData | null;
}
import { useAuth } from "@/contexts/auth-context";
import {
  getSelectedPathway,
  loadPathwaysFromDb,
  loadPathwaySnapshots,
} from "@/lib/supabase-pathways";
import type { PathwaySnapshot, Pathway } from "@/lib/supabase-pathways";
import {
  getCoursesForProfile,
  getProfileForUser,
} from "@/lib/supabase-profiles";
import { IGETC_AREAS, CSU_GE_AREAS } from "@/components/courses/course-types";
import type { TransferabilityResult, CourseTransferResult } from "@/components/courses/course-types";
import { computeGpaSummary, graduationProgressPercent, transferProgressPercent } from "@/lib/course-progress";
import type { StoredCourse } from "@/lib/course-progress";

type Tab = "log" | "timeline" | "assessment" | "history" | "planned";

export default function ProgressTracker() {
  const { enabled: prMotionOn, lift: prLift, itemVariants, containerVariants } = useBrutalistMotion();
  const { profileId } = useParams<{ profileId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const pid = parseInt(profileId);

  // Pathway gate
  const [pathwayInfo, setPathwayInfo] = useState<PathwayInfo | null>(null);
  const [pathwayLoading, setPathwayLoading] = useState(true);

  // Courses data for transfer/IGETC overview
  const [profileCourses, setProfileCourses] = useState<StoredCourse[]>([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [profileGpa, setProfileGpa] = useState<number | null>(null);
  const [igetcDoneCount, setIgetcDoneCount] = useState<number | null>(null);
  const [calgetcDoneCount, setCalgetcDoneCount] = useState<number | null>(null);
  const [gePattern, setGePattern] = useState<"igetc" | "calgetc">("igetc");
  const [transferabilityResult, setTransferabilityResult] = useState<TransferabilityResult | null>(null);

  // Tab
  const [tab, setTab] = useState<Tab>("log");

  // Log form
  const [entryType, setEntryType] = useState<EntryType>("gpa_update");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [numericValue, setNumericValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Entry feedback
  const [pendingFeedback, setPendingFeedback] = useState<{ loading: boolean; data: EntryFeedback | null; entryTitle: string }>({
    loading: false, data: null, entryTitle: "",
  });

  // Timeline
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [filterType, setFilterType] = useState<EntryType | "all">("all");

  // Assessment
  const [analyses, setAnalyses] = useState<ProgressAnalysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [activeAnalysis, setActiveAnalysis] = useState<ProgressAnalysis | null>(null);
  const [generating, setGenerating] = useState(false);
  const [, setCurrentSection] = useState("");

  // Pathway history snapshots
  const [pathwaySnapshots, setPathwaySnapshots] = useState<PathwaySnapshot[]>([]);
  const [pathwayHistory, setPathwayHistory] = useState<Pathway[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const analysisRef = useRef<HTMLDivElement>(null);

  // Load pathway gate + data (Supabase direct, no non-existent API endpoints)
  useEffect(() => {
    if (!user?.id) {
      setPathwayLoading(false);
      return;
    }

    let cancelled = false;

    getSelectedPathway(pid).then(selected => {
      if (cancelled) return;
      if (selected) {
        setPathwayInfo({
          hasSelectedPathway: true,
          pathway: {
            university: selected.reportJson?.university,
            pathwayType: selected.pathwayType,
            compatibilityScore: selected.compatibilityScore,
            gpaTarget: selected.reportJson?.gpaTarget,
            requiredUnits: selected.reportJson?.requiredUnits,
            courseGaps: selected.reportJson?.courseGaps,
            risks: selected.reportJson?.risks,
            nextSteps: selected.reportJson?.nextSteps,
          },
        });
      } else {
        setPathwayInfo({ hasSelectedPathway: false, pathway: null });
      }
    }).catch(() => {
      if (!cancelled) setPathwayInfo({ hasSelectedPathway: false, pathway: null });
    }).finally(() => {
      if (!cancelled) setPathwayLoading(false);
    });

    getCoursesForProfile(pid).then(courses => {
      if (cancelled) return;
      setProfileCourses(courses);
      const gpaSummary = computeGpaSummary(courses);
      setTotalUnits(gpaSummary.totalUnits ?? 0);
    }).catch(() => {});

    // Only load GPA from Supabase when using real auth UUIDs (not the "dev" bypass user)
    if (user.id !== "dev") {
      getProfileForUser(user.id).then(profile => {
        if (cancelled) return;
        setProfileGpa(profile?.currentGpa ?? null);
      }).catch(() => {});
    }

    fetch(`/api/profiles/${pid}/progress`, { credentials: "include" })
      .then(r => r.json())
      .then((e: ProgressEntry[]) => setEntries(e))
      .catch(() => {})
      .finally(() => setLoadingEntries(false));

    fetch(`/api/profiles/${pid}/progress/analyses`, { credentials: "include" })
      .then(r => r.json())
      .then((a: ProgressAnalysis[]) => { setAnalyses(a); if (a.length > 0) setActiveAnalysis(a[0]); })
      .catch(() => {})
      .finally(() => setLoadingAnalyses(false));

    // Load IGETC areas (may not exist in production — degrade gracefully)
    fetch(`/api/profiles/${pid}/igetc`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { areas?: Record<string, boolean> } | null) => {
        if (data?.areas) {
          setIgetcDoneCount(Object.values(data.areas).filter(Boolean).length);
        }
      })
      .catch(() => {});

    // Load CalGETC areas (may not exist in production — degrade gracefully)
    fetch(`/api/profiles/${pid}/calgetc`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { areas?: Record<string, boolean> } | null) => {
        if (data?.areas) {
          setCalgetcDoneCount(Object.values(data.areas).filter(Boolean).length);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pid, user?.id]);

  // Ensure you return your JSX element below (e.g. <AppPageLayout>...)
  return (
    <AppPageLayout>
      <div>Progress Tracker Dashboard</div>
    </AppPageLayout>
  );
}