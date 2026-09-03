import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, CheckCircle2, Upload, LogOut } from "lucide-react";
import { KaleonLoader } from "@/components/ui/kaleon-loader";
import { extractTextFromPDF, parseTranscriptText } from "@/lib/parse-transcript";
import { fetchWithTimeout, withTimeout } from "@/lib/api/client";
import { useRequestCleanup } from "@/hooks/use-request-cleanup";
import { appendDevCourses, deleteDevCompletedCoursesByCodes } from "@/lib/dev-courses";
import { deleteAllDevPathways } from "@/lib/dev-pathways";
import { DEV_PROFILE_ID, deleteAllDevSemesterSnapshots, getDevSemesterSnapshots, isAuthBypass, saveDevProfile, saveDevSemesterSnapshot } from "@/lib/dev-profile";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createProfile, deleteCompletedCoursesForProfileByCodes, getProfileById, getProfileForUser, insertCourses, updateProfile } from "@/lib/supabase-profiles";
import { createSnapshot, deleteAllSnapshots, getLatestSnapshot } from "@/lib/supabase-semesters";
import { deleteAllPathwaysForProfile, deleteAllPathwaySnapshotsForProfile } from "@/lib/supabase-pathways";
import { useMotionEnabled, useDirSign } from "@/lib/motion";
import { KALEON_LOGO_SRC } from "@/lib/brand";
import { t } from "@/lib/copy";
import { displayName } from "@/lib/display-name";

import { IntroPhase } from "@/components/onboarding/intro-phase";
import { CalculatingPhase } from "@/components/onboarding/calculating-phase";
import { CelebrationPhase } from "@/components/onboarding/celebration-phase";
import { ReadyPhase } from "@/components/onboarding/ready-phase";
import { SchoolPreviewPhase } from "@/components/onboarding/school-preview-phase";
import { FormSteps } from "@/components/onboarding/form-steps";
import {
  ONBOARDING_PAGE_BG, ONBOARDING_CARD, STEP_ICONS, INTRO_DURATION_MS,
} from "@/components/onboarding/onboarding-constants";
import type { FormData, PendingTranscript, ScanResult } from "@/components/onboarding/onboarding-types";

export default function Onboarding() {
  const STEPS: {
    title: string;
    subtitle: string;
    icon: (typeof STEP_ICONS)[number] | null;
  }[] = [
    { title: t("onboarding.step1Title"), subtitle: t("onboarding.step1Subtitle"), icon: null },
    { title: t("onboarding.step2Title"), subtitle: t("onboarding.step2Subtitle"), icon: STEP_ICONS[0] },
    { title: "Review Your Scan", subtitle: "Confirm everything is accurate before we map your path", icon: STEP_ICONS[1] },
    { title: "Timeline & Background", subtitle: "Help us personalize your pathway", icon: STEP_ICONS[2] },
  ];

  const { user, updateProfileName, logout } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"intro" | "form" | "calculating" | "celebration" | "ready" | "schools">("intro");
  const [isReupload, setIsReupload] = useState(false);
  const reuploadProfileIdRef = useRef<number | null>(null);
  const [pendingTranscripts, setPendingTranscripts] = useState<PendingTranscript[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [hasMultipleColleges, setHasMultipleColleges] = useState<boolean | null>(null);
  const [skippingUpload, setSkippingUpload] = useState(false);
  const pendingIdRef = useRef(0);
  const [pathwaySchools, setPathwaySchools] = useState<{
    university: string;
    pathwayType: "least_compatible" | "moderately_compatible" | "most_compatible";
    compatibilityScore: number;
  }[]>([]);
  const createdProfileIdRef = useRef<number | null>(null);
  const submitLockRef = useRef(false);
  const getSignal = useRequestCleanup();
  const [form, setForm] = useState<FormData>({
    fullName: user
      ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName ?? ""))
      : "",
    communityCollege: "",
    intendedMajor: "",
    careerGoal: "",
    transferTimeline: "",
    financialSituation: "",
    isFirstGen: "",
  });

  const set = (k: keyof FormData, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const transcriptReplacementCodes = async (profileId: number): Promise<string[]> => {
    const incomingCodes = flattenedCourses
      .map((course) => course.code.trim().toUpperCase())
      .filter((code) => code.length > 0);

    let previousCodes: string[] = [];
    if (isAuthBypass()) {
      const snapshots = getDevSemesterSnapshots(profileId);
      const latest = snapshots[snapshots.length - 1];
      previousCodes = (latest?.courses ?? [])
        .map((course) => (course.course_code ?? "").trim().toUpperCase())
        .filter((code) => code.length > 0);
    } else if (isSupabaseConfigured) {
      const snapshot = await withTimeout(getLatestSnapshot(profileId), 20_000, "onboarding.getLatestSnapshot");
      previousCodes = (snapshot?.courses ?? [])
        .map((course) => (course.course_code ?? "").trim().toUpperCase())
        .filter((code) => code.length > 0);
    }

    const combined = [...incomingCodes, ...previousCodes];
    return [...new Set(combined)];
  };

  useEffect(() => {
    // Check if this is a re-upload from the courses page.
    // Runs once on mount only — this must NOT depend on `phase`, otherwise it
    // re-fires on every phase change (including the post-submit transition to
    // "calculating"/"celebration") and unconditionally snaps phase back to
    // "form" every time, since the URL still carries ?reupload=<id>.
    const params = new URLSearchParams(window.location.search);
    const reuploadVal = params.get("reupload");
    if (reuploadVal) {
      const pid = parseInt(reuploadVal, 10);
      if (!isNaN(pid)) {
        reuploadProfileIdRef.current = pid;
        setIsReupload(true);
        setPhase("form");
      }
    }
  }, []);

  useEffect(() => {
    if (phase !== "intro") return;
    const id = window.setTimeout(() => setPhase("form"), INTRO_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "celebration") return;
    const id = window.setTimeout(() => setPhase("ready"), INTRO_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const handleAddPendingFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) return;
    const id = `pending-${++pendingIdRef.current}`;
    setPendingTranscripts(prev => [...prev, { id, file, college: "" }]);
  };

  const handleUpdatePendingCollege = (id: string, college: string) => {
    setPendingTranscripts(prev =>
      prev.map(pt => (pt.id === id ? { ...pt, college } : pt))
    );
  };

  const handleRemovePendingFile = (id: string) => {
    setPendingTranscripts(prev => prev.filter(pt => pt.id !== id));
  };

  const handleScan = async () => {
    if (pendingTranscripts.length === 0) return;
    setScanning(true);
    setScanError(null);
    const results: ScanResult[] = [];
    try {
      for (const pt of pendingTranscripts) {
        // On mobile browsers, extract PDF text server-side because pdfjs workers
        // are unreliable there. Desktop keeps the faster client-side path.
        let text: string;
        const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobileBrowser) {
          const uploadRes = await fetchWithTimeout("/api/transcript/extract-pdf-text", {
            method: "POST",
            headers: { "Content-Type": "application/pdf" },
            body: pt.file,
            timeout: 180_000,
          }, getSignal());
          if (!uploadRes.ok) {
            const errBody = await uploadRes.json().catch(() => null) as { error?: string } | null;
            throw new Error(errBody?.error ?? `Server extraction failed (${uploadRes.status})`);
          }
          const { text: extracted } = await uploadRes.json() as { text: string };
          text = extracted;
        } else {
          text = await extractTextFromPDF(pt.file);
        }

        if (!text.trim()) {
          results.push({
            college: pt.college.trim() || pt.file.name.replace(/\.pdf$/i, ""),
            courses: [],
            latestGpa: null,
            totalUnits: 0,
            detectedMajor: null,
          });
          continue;
        }

        // 2. Try AI-powered parsing via server endpoint
        let result: {
          courses: {
            code: string;
            name: string;
            units?: number;
            term?: string;
            college?: string;
            grade?: string;
            status?: "completed" | "in_progress" | "planned";
          }[];
          latestGpa: number | null;
          totalUnits: number;
          detectedMajor?: string | null;
        };
        try {
          const res = await fetchWithTimeout("/api/transcript/parse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, detectMultipleColleges: hasMultipleColleges === true }),
            timeout: 180_000,
          }, getSignal());
          if (res.ok) {
            result = (await res.json()) as typeof result;
          } else {
            throw new Error(`Server returned ${res.status}`);
          }
        } catch {
          // 3. Fallback to client-side regex parser
          const fallback = parseTranscriptText(text);
          result = {
            ...fallback,
            latestGpa: fallback.latestGpa ?? null,
            detectedMajor: fallback.detectedMajor ?? null,
          };
        }

        // Determine college name: use per-course college if detected, else the file's college
        const defaultCollege = pt.college.trim() || pt.file.name.replace(/\.pdf$/i, "");
        results.push({
          college: defaultCollege,
          courses: result.courses.map(c => ({
            code: c.code,
            name: c.name,
            units: c.units,
            term: c.term,
            college: c.college,
            grade: c.grade,
            status: c.status,
          })),
          latestGpa: result.latestGpa,
          totalUnits: result.totalUnits,
          detectedMajor: result.detectedMajor,
        });
      }
      setScanResults(results);
      setPendingTranscripts([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile && (!msg || msg.includes("undefined") || msg.includes("worker") || msg.includes("Worker"))) {
        setScanError(
          "Your mobile browser couldn't process this PDF directly. " +
          "You can either try a smaller or text-based PDF, or skip scanning " +
          "and add your courses manually in the next step."
        );
      } else {
        setScanError(msg || "Could not read one or more PDFs. You can skip scanning and add courses manually later.");
      }
    } finally {
      setScanning(false);
    }
  };

  const handleRemoveCourseFromScan = (college: string, code: string) => {
    setScanResults(prev =>
      prev.map(sr =>
        sr.college === college
          ? { ...sr, courses: sr.courses.filter(c => c.code !== code) }
          : sr,
      ).filter(sr => sr.courses.length > 0)
    );
  };

  const handleAddCourseToScan = (college: string, course: { code: string; name: string; units?: number; term?: string }) => {
    setScanResults(prev =>
      prev.map(sr =>
        sr.college === college
          ? { ...sr, courses: [...sr.courses, course], totalUnits: sr.totalUnits + (course.units ?? 0) }
          : sr,
      )
    );
  };

  const handleUpdateCourseInScan = (college: string, oldCode: string, updated: { code: string; name: string; units?: number; term?: string }) => {
    setScanResults(prev =>
      prev.map(sr => {
        if (sr.college !== college) return sr;
        const updatedCourses = sr.courses.map(c => (c.code === oldCode ? { ...c, ...updated } : c));
        return {
          ...sr,
          courses: updatedCourses,
          totalUnits: updatedCourses.reduce((sum, c) => sum + (c.units ?? 0), 0),
        };
      })
    );
  };

  const handleClearAllTranscripts = () => {
    setPendingTranscripts([]);
    setScanning(false);
    setScanError(null);
    setScanResults([]);
  };

  const canProceed = () => {
    if (step === 0) return !scanning && (scanResults.length > 0 || skippingUpload);
    if (step === 1) return form.communityCollege.trim().length > 0 && form.intendedMajor.trim().length > 0;
    return true;
  };

  const flattenedCourses = scanResults.flatMap((result) =>
    result.courses
      .map((course) => {
        const code = course.code.trim();
        const name = course.name.trim() || code;
        return { ...course, code, name };
      })
      .filter((course) => course.code.length > 0 || course.name.length > 0),
  );
  const flattenedGpa = scanResults.reduce<number | null>((best, result) => {
    if (result.latestGpa === null) return best;
    return best === null || result.latestGpa > best ? result.latestGpa : best;
  }, null);
  const flattenedTotalUnits = flattenedCourses.reduce((sum, course) => sum + (course.units ?? 0), 0);

  // Determine the best term label from parsed courses, or use a fallback
  const detectedTermLabel = (
    courses: Array<{ term?: string }>,
  ): string => {
    const terms = courses
      .map((c) => c.term)
      .filter((t): t is string => Boolean(t && t.trim()));
    if (terms.length === 0) return "Initial Transcript";
    const freq = new Map<string, number>();
    for (const t of terms) freq.set(t, (freq.get(t) ?? 0) + 1);
    let best = "";
    let bestCount = 0;
    for (const [t, count] of freq) {
      if (count > bestCount) {
        best = t;
        bestCount = count;
      }
    }
    return best || "Initial Transcript";
  };
  const termLabel = detectedTermLabel(flattenedCourses);

  const submit = async () => {
    if (!user?.id || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (!skippingUpload && scanResults.length > 0 && flattenedCourses.length === 0) {
        setScanError(
          "Kaleon read this transcript but could not recover any courses to save yet. " +
          "Please review the scan, add at least one course manually, or skip transcript upload " +
          "and enter courses from the Courses page."
        );
        setStep(0);
        return;
      }

      const payload = {
        userId: user.id,
        fullName: form.fullName || user.firstName || "",
        communityCollege: form.communityCollege,
        intendedMajor: form.intendedMajor,
        careerGoal: form.careerGoal,
        currentGpa: flattenedGpa ?? undefined,
        transferTimeline: form.transferTimeline,
        financialSituation: form.financialSituation,
        isFirstGen: form.isFirstGen,
        completionPercent: 60,
      };

      if (isAuthBypass()) {
        const activeProfileId = reuploadProfileIdRef.current ?? DEV_PROFILE_ID;
        if (flattenedCourses.length > 0) {
          const replaceCodes = await transcriptReplacementCodes(activeProfileId);
          deleteDevCompletedCoursesByCodes(activeProfileId, replaceCodes);
        }
        saveDevProfile({
          fullName: payload.fullName,
          communityCollege: payload.communityCollege,
          intendedMajor: payload.intendedMajor,
          careerGoal: payload.careerGoal,
          currentGpa: payload.currentGpa,
          transferTimeline: payload.transferTimeline,
          financialSituation: payload.financialSituation,
          isFirstGen: payload.isFirstGen,
          completionPercent: payload.completionPercent,
        });
        if (flattenedCourses.length > 0) {
          appendDevCourses(activeProfileId, flattenedCourses.map(c => ({
            courseCode: c.code,
            courseName: c.name,
            units: c.units,
            grade: c.grade,
            term: c.term,
            status: c.status ?? (typeof c.units === "number" && c.units > 0 ? "completed" : "planned"),
          })));
        }
        if (flattenedCourses.length > 0 || flattenedGpa !== null) {
          if (isReupload) {
            deleteAllDevSemesterSnapshots(activeProfileId);
            deleteAllDevPathways(activeProfileId);
          }
          saveDevSemesterSnapshot(activeProfileId, {
            user_id: user.id,
            profile_id: activeProfileId,
            term_label: termLabel,
            college: form.communityCollege || "Unknown",
            cumulative_gpa: flattenedGpa ?? null,
            cumulative_units: flattenedTotalUnits || null,
            term_gpa: flattenedGpa ?? null,
            term_units: flattenedTotalUnits || null,
            courses: flattenedCourses.map(c => ({
              course_code: c.code,
              course_name: c.name,
              units: c.units ?? null,
              grade: c.grade ?? null,
            })),
          });
        }
        createdProfileIdRef.current = activeProfileId;
        setPhase("calculating");
        setTimeout(() => setPhase("celebration"), 1200);
        return;
      }

      // Real Supabase path: get-or-create profile + insert courses via Supabase direct
      if (isSupabaseConfigured && !isAuthBypass()) {
        const reuploadProfileId = reuploadProfileIdRef.current;
        let sp = reuploadProfileId
          ? await withTimeout(getProfileById(reuploadProfileId), 20_000, "onboarding.getProfileById")
          : await withTimeout(getProfileForUser(user.id), 20_000, "onboarding.getProfileForUser");
        if (sp) {
          sp = await withTimeout(updateProfile(sp.id, {
            fullName: payload.fullName,
            communityCollege: payload.communityCollege,
            intendedMajor: payload.intendedMajor,
            careerGoal: payload.careerGoal,
            currentGpa: payload.currentGpa,
            transferTimeline: payload.transferTimeline,
            financialSituation: payload.financialSituation,
            isFirstGen: payload.isFirstGen,
            completionPercent: payload.completionPercent,
          }), 20_000, "onboarding.updateProfile");
        } else {
          sp = await withTimeout(createProfile(user.id, {
            fullName: payload.fullName,
            communityCollege: payload.communityCollege,
            intendedMajor: payload.intendedMajor,
            careerGoal: payload.careerGoal,
            currentGpa: payload.currentGpa,
            transferTimeline: payload.transferTimeline,
            financialSituation: payload.financialSituation,
            isFirstGen: payload.isFirstGen,
            completionPercent: payload.completionPercent,
          }), 20_000, "onboarding.createProfile");
        }
        if (!sp?.id) throw new Error("Failed to create profile");
        createdProfileIdRef.current = sp.id;

        if (flattenedCourses.length > 0) {
          const replaceCodes = await transcriptReplacementCodes(sp.id);
          const deletedCompleted = await withTimeout(
            deleteCompletedCoursesForProfileByCodes(sp.id, replaceCodes),
            20_000,
            "onboarding.deleteCompletedCoursesForProfileByCodes",
          );
          if (!deletedCompleted) {
            throw new Error("Failed to replace transcript-derived completed courses");
          }
          if (isReupload) {
            const snapshotsDeleted = await withTimeout(deleteAllSnapshots(sp.id), 20_000, "onboarding.deleteAllSnapshots");
            if (!snapshotsDeleted) throw new Error("Failed to clear stale semester snapshots");
            const pathwaysDeleted = await withTimeout(deleteAllPathwaysForProfile(sp.id), 20_000, "onboarding.deleteAllPathwaysForProfile");
            if (!pathwaysDeleted) throw new Error("Failed to clear stale pathways");
            const pathwaySnapshotsDeleted = await withTimeout(deleteAllPathwaySnapshotsForProfile(sp.id), 20_000, "onboarding.deleteAllPathwaySnapshotsForProfile");
            if (!pathwaySnapshotsDeleted) throw new Error("Failed to clear stale pathway snapshots");
          }
          await withTimeout(insertCourses(sp.id, user.id, flattenedCourses.map(c => ({
            courseCode: c.code,
            courseName: c.name,
            units: c.units,
            grade: c.grade,
            term: c.term,
            status: c.status ?? (typeof c.units === "number" && c.units > 0 ? "completed" : "planned"),
          }))), 20_000, "onboarding.insertCourses");
        }

        const snapshotInputs = scanResults
          .map((result) => {
            const snapshotCourses = result.courses
              .map((course) => {
                const code = course.code.trim();
                const name = course.name.trim() || code;
                return { ...course, code, name };
              })
              .filter((course) => course.code.length > 0 || course.name.length > 0);
            const snapshotUnits = snapshotCourses.reduce((sum, course) => sum + (course.units ?? 0), 0);
            if (snapshotCourses.length === 0 && result.latestGpa === null) {
              return null;
            }
            return {
              user_id: user.id,
              profile_id: sp.id,
              term_label: detectedTermLabel(snapshotCourses),
              college: result.college || form.communityCollege || "Unknown",
              cumulative_gpa: result.latestGpa ?? null,
              cumulative_units: snapshotUnits || null,
              term_gpa: result.latestGpa ?? null,
              term_units: snapshotUnits || null,
              courses: snapshotCourses.map((course) => ({
                course_code: course.code,
                course_name: course.name,
                units: course.units ?? null,
                grade: course.grade ?? null,
              })),
            };
          })
          .filter((value): value is NonNullable<typeof value> => value !== null);

        if (snapshotInputs.length > 0) {
          await withTimeout(
            Promise.all(snapshotInputs.map((input) => createSnapshot(input))),
            20_000,
            "onboarding.createSnapshots",
          );
        }

        if (!user.firstName?.trim()) {
          const first = payload.fullName.trim().split(/\s+/)[0];
          if (first) {
            await withTimeout(updateProfileName(first), 20_000, "onboarding.updateProfileName");
          }
        }

        setPhase("calculating");
        setTimeout(() => setPhase("celebration"), 1200);
        return;
      }

      // Legacy / mock path (non-Supabase or auth bypass)
      const r = await fetch("/api/profiles", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to create profile");
      const created = (await r.json()) as { id: number };
      createdProfileIdRef.current = created.id;

      if (flattenedCourses.length > 0) {
        const replaceCodes = await transcriptReplacementCodes(created.id);
        const saveRes = await fetch(`/api/profiles/${created.id}/courses/bulk`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latestGpa: flattenedGpa ?? undefined,
            replaceCodes,
            courses: flattenedCourses.map((c) => ({
              courseCode: c.code,
              courseName: c.name,
              units: c.units,
              grade: c.grade,
              term: c.term,
              status: c.status ?? (typeof c.units === "number" && c.units > 0 ? "completed" : "planned"),
            })),
          }),
        });
        if (!saveRes.ok) {
          throw new Error("Failed to save transcript courses");
        }
      }

      setPhase("calculating");

      // Try to generate pathways in the background
      try {
        const pwRes = await fetch(`/api/profiles/${created.id}/generate-pathways`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: created.id,
            fullName: payload.fullName,
            communityCollege: payload.communityCollege,
            intendedMajor: payload.intendedMajor,
            careerGoal: payload.careerGoal,
            currentGpa: flattenedGpa ?? undefined,
            transferTimeline: form.transferTimeline,
            financialSituation: form.financialSituation,
            isFirstGen: form.isFirstGen,
            courses: flattenedCourses.map(c => ({
              courseCode: c.code,
              courseName: c.name,
              units: c.units,
              grade: c.grade,
              term: c.term,
              status: c.status ?? (typeof c.units === "number" && c.units > 0 ? "completed" : "planned"),
            })),
            totalUnits: flattenedTotalUnits || undefined,
          }),
        });
        if (pwRes.ok) {
          const pwData = await pwRes.json() as {
            pathways?: Array<{
              pathwayType: string;
              compatibilityScore: number;
              reportJson?: { university: string };
            }>;
          };
          const schools = (pwData.pathways ?? []).map((p) => {
            const pt: "least_compatible" | "moderately_compatible" | "most_compatible" =
              p.pathwayType === "least_compatible" || p.pathwayType === "most_compatible"
                ? p.pathwayType
                : "moderately_compatible";
            return {
              university: p.reportJson?.university ?? "UC Campus",
              pathwayType: pt as "least_compatible" | "moderately_compatible" | "most_compatible",
              compatibilityScore: p.compatibilityScore ?? 70,
            } satisfies { university: string; pathwayType: "least_compatible" | "moderately_compatible" | "most_compatible"; compatibilityScore: number };
          });
          if (schools.length > 0) {
            setPathwaySchools(schools);
            setPhase("schools");
            return;
          }
        }
      } catch {
        // Non-fatal — fall through to ready phase
      }
      setPhase("celebration");
    } catch (e) {
      console.error("[onboarding] submit failed", e);
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const progress = Math.max(10, ((step) / (STEPS.length - 1)) * 100);
  const StepIcon = STEPS[step].icon;
  const motionOn = useMotionEnabled();
  const dir = useDirSign();

  if (phase === "intro") return <IntroPhase firstName={displayName(user, form.fullName || null)} />;
  if (phase === "calculating") return <CalculatingPhase />;
  if (phase === "celebration") return <CelebrationPhase />;
  if (phase === "ready") return <ReadyPhase profileId={createdProfileIdRef.current ?? DEV_PROFILE_ID} />;
  if (phase === "schools") {
    return (
      <SchoolPreviewPhase
        pathways={pathwaySchools}
        profileId={createdProfileIdRef.current ?? DEV_PROFILE_ID}
      />
    );
  }

  return (
    <div className="min-h-screen pwc-font-sans flex items-center justify-center px-4 py-12" style={ONBOARDING_PAGE_BG}>
      <div className="w-full max-w-lg">
        {/* Logo + sign out */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <img src={KALEON_LOGO_SRC} alt="" width={28} height={28} className="shrink-0 object-contain" aria-hidden />
            <span className="text-xl font-semibold tracking-tight" style={{ color: "#f8fafc" }}>
              Kaleon
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-xs gap-1.5 hover:bg-[rgba(78,204,163,0.08)]"
            style={{ color: "#94a3b8" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-1.5 flex justify-between text-sm" style={{ color: "#94a3b8" }}>
            <span>{t("onboarding.stepOf", { current: step + 1, total: STEPS.length })}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(78,204,163,0.12)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #4ECCA3, #38b2ac)" }}
            />
          </div>
        </div>

        <div className="overflow-hidden shadow-xl" style={ONBOARDING_CARD}>
          {/* Header */}
          <div className="px-8 py-6" style={{ borderBottom: "1px solid rgba(78,204,163,0.2)", background: "rgba(78,204,163,0.06)" }}>
            <div className="flex items-center gap-3 mb-1">
              {step === 0 ? (
                <img src={KALEON_LOGO_SRC} alt="" width={22} height={22} className="shrink-0 object-contain" aria-hidden />
              ) : (
                StepIcon && <StepIcon className="h-5 w-5" style={{ color: "#4ECCA3" }} aria-hidden />
              )}
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#f8fafc" }}>
                {STEPS[step].title}
              </h1>
            </div>
            <p className="text-sm" style={{ color: "#94a3b8" }}>{STEPS[step].subtitle}</p>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-5 relative" style={{ overflow: "visible" }}>
            {isReupload && (
              <div className="flex items-center gap-3 p-3 rounded-xl text-sm" style={{ background: "rgba(251, 191, 36, 0.12)", border: "1px solid rgba(251, 191, 36, 0.35)" }}>
                <Upload className="h-4 w-4 shrink-0" style={{ color: "#f59e0b" }} aria-hidden />
                <span style={{ color: "#fbbf24" }}>{t("onboarding.reuploadBanner")}</span>
              </div>
            )}
            <FormSteps
              step={step}
              form={form}
              onSet={set}
              pendingTranscripts={pendingTranscripts}
              onAddPendingFile={handleAddPendingFile}
              onUpdatePendingCollege={handleUpdatePendingCollege}
              onRemovePendingFile={handleRemovePendingFile}
              scanning={scanning}
              scanError={scanError}
              scanResults={scanResults}
              onScan={handleScan}
              onRemoveCourseFromScan={handleRemoveCourseFromScan}
              onAddCourseToScan={handleAddCourseToScan}
              onUpdateCourseInScan={handleUpdateCourseInScan}
              onClearAllTranscripts={handleClearAllTranscripts}
              hasMultipleColleges={hasMultipleColleges}
              onSetMultipleColleges={setHasMultipleColleges}
              skippingUpload={skippingUpload}
              onSetSkippingUpload={setSkippingUpload}
              motionOn={motionOn}
              dir={dir}
            />
          </div>

          {submitError && (
            <div
              role="alert"
              className="mx-8 mb-4 px-4 py-3 text-sm"
              style={{
                color: "#fca5a5",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8,
              }}
            >
              {submitError}
            </div>
          )}

          {/* Footer buttons */}
          <div className="px-8 pb-8 pt-4 flex items-end justify-between gap-3" style={{ borderTop: "1px solid rgba(78,204,163,0.15)" }}>
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="hover:bg-[rgba(78,204,163,0.08)]" style={{ color: "#94a3b8" }}>
                <ArrowLeft className="h-4 w-4 mr-1" />{t("onboarding.back")}
              </Button>
            ) : (
              <div className="h-10" />
            )}

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="ml-auto border-0 hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
              >
                {t("onboarding.continue")} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void submit()}
                disabled={submitting || !user?.id}
                className="ml-auto border-0 hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
              >
                {submitting
                  ? <><KaleonLoader size={16} />{t("onboarding.creating")}</>
                  : <><CheckCircle2 className="h-4 w-4 mr-2" />{t("onboarding.startJourney")}</>
                }
              </Button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--app-text-muted)" }}>
          {t("onboarding.updateLater")}
        </p>
      </div>
    </div>
  );
}
