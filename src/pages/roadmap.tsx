import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { AppPageLayout } from "@/components/app-page-layout";
import {
  downloadMarkdownFile,
  MarkdownDocumentNotFound,
  MarkdownDocumentBackButton,
} from "@/components/markdown-document-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Download, MapPin, AlertTriangle,
  CheckSquare, Square, CheckCircle2, Image as ImageIcon, FileText, Sparkles,
  Link2, Copy, Check, X, RefreshCw,
} from "lucide-react";
import { KaleonLoader } from "@/components/ui/kaleon-loader";
import { MarkdownContent } from "@/components/markdown-renderer";
import { PageMotion } from "@/components/page-motion";
import { t } from "@/lib/copy";
import type { AcademicRoadmap } from "@/types/markdown-document";
import { loadRoadmap } from "@/lib/supabase-documents";

export default function Roadmap() {
  const { roadmapId } = useParams<{ roadmapId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [roadmap, setRoadmap] = useState<AcademicRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setCurrentSection] = useState("");
  const [infographicLoading, setInfographicLoading] = useState(false);
  const [infographicReady, setInfographicReady] = useState<{ pngUrl: string; pdfUrl: string; cached: boolean } | null>(null);
  const [status, setStatus] = useState<{
    currentHash: string;
    hasCurrent: boolean;
    isStale: boolean;
    cached: { versionHash: string; generatedAt: string; pngUrl: string; pdfUrl: string } | null;
  } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [shareBusy, setShareBusy] = useState(false);
  const rid = parseInt(roadmapId);

  useEffect(() => {
    loadRoadmap(rid).then((doc) => {
      if (doc) {
        setRoadmap({
          id: doc.id,
          title: doc.title,
          contentMarkdown: doc.contentMarkdown,
          createdAt: doc.createdAt,
          profileId: doc.profileId,
        });
      }
    }).catch(() => {
      toast({ title: t("pages.roadmap.errorLoading"), variant: "destructive" });
    }).finally(() => setLoading(false));
  }, [rid]);

  const refreshStatus = async () => {
    try {
      const res = await fetch(`/api/roadmaps/${rid}/infographic/status`, { credentials: "include" });
      if (!res.ok) return;
      const j = await res.json();
      setStatus(j);
      // Surface the most recent cached version for download even before the user
      // taps Generate, so the existing image stays available while they decide.
      if (j?.cached && !infographicReady) {
        setInfographicReady({ pngUrl: j.cached.pngUrl, pdfUrl: j.cached.pdfUrl, cached: true });
      }
    } catch {
      // Status is optional context; ignore network errors.
    }
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  useEffect(() => {
    fetch(`/api/roadmaps/${rid}/share`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((j) => {
        if (j?.active) {
          setShareUrl(j.active.shareUrl);
          setShareExpiresAt(j.active.expiresAt);
        }
      })
      .catch(() => {});
  }, [rid]);

  const generateInfographic = async () => {
    setInfographicLoading(true);
    try {
      const res = await fetch(`/api/roadmaps/${rid}/infographic`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error ?? t("pages.roadmap.couldNotGenerate"), variant: "destructive" });
        return;
      }
      setInfographicReady({ pngUrl: json.pngUrl, pdfUrl: json.pdfUrl, cached: !!json.cached });
      if (json.shareUrl) {
        setShareUrl(json.shareUrl);
        setShareExpiresAt(json.shareExpiresAt ?? null);
      }
      toast({
        title: json.cached ? t("pages.roadmap.infographicReadyCached") : t("pages.roadmap.infographicGenerated"),
        description: json.cached ? t("pages.roadmap.infographicCachedDesc") : t("pages.roadmap.infographicNewDesc"),
      });
      // Re-check status so the "stale" banner clears after a fresh build.
      refreshStatus();
    } catch {
      toast({ title: t("pages.roadmap.networkErrorInfographic"), variant: "destructive" });
    } finally {
      setInfographicLoading(false);
    }
  };

  const downloadInfographic = (format: "png" | "pdf") => {
    const url = format === "png" ? infographicReady?.pngUrl : infographicReady?.pdfUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `pathwise-roadmap-${rid}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const createShareLink = async () => {
    setShareBusy(true);
    try {
      const res = await fetch(`/api/roadmaps/${rid}/share`, { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error ?? "Could not create share link", variant: "destructive" });
        return;
      }
      setShareUrl(json.shareUrl);
      setShareExpiresAt(json.expiresAt ?? null);
      await copyToClipboard(json.shareUrl);
    } catch {
      toast({ title: "Network error creating share link", variant: "destructive" });
    } finally {
      setShareBusy(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopyState("copied");
      toast({ title: "Share link copied", description: "Paste it into a text or email." });
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      toast({ title: "Could not copy link", description: "Long-press the link to copy it manually.", variant: "destructive" });
    }
  };

  const revokeShareLink = async () => {
    if (!shareUrl) return;
    if (!confirm("Revoke this share link? Anyone with the link will get a 'no longer available' message.")) return;
    setShareBusy(true);
    try {
      const res = await fetch(`/api/roadmaps/${rid}/share`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({ title: json.error ?? "Could not revoke link", variant: "destructive" });
        return;
      }
      setShareUrl(null);
      setShareExpiresAt(null);
      toast({ title: "Share link revoked" });
    } catch {
      toast({ title: "Network error revoking link", variant: "destructive" });
    } finally {
      setShareBusy(false);
    }
  };

  const downloadMarkdown = () => {
    if (!roadmap?.contentMarkdown) return;
    downloadMarkdownFile(roadmap.contentMarkdown, `dyp-roadmap-${roadmap.id}.md`);
    toast({ title: t("pages.roadmap.roadmapDownloaded") });
  };

  if (loading) {
    return <PageLoadingState message={t("pages.roadmap.loadingRoadmap")} />;
  }

  if (!roadmap) {
    return (
      <MarkdownDocumentNotFound
        message={t("pages.roadmap.notFound")}
        icon={<MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />}
        action={
          <MarkdownDocumentBackButton
            label={t("pages.roadmap.goHome")}
            onClick={() => navigate("/")}
          />
        }
      />
    );
  }

  return (
    <AppPageLayout profileId={roadmap.profileId} maxWidth="3xl">
        {/* Header */}
        <div className="py-6 flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {t("pages.roadmap.backToPathways")}
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full border border-violet-200">
                {t("pages.roadmap.academicRoadmapPlanner")}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-tight">{roadmap.title ?? t("pages.roadmap.defaultTitle")}</h1>
            {roadmap.createdAt && (
              <p className="text-xs text-slate-400 mt-1">
                {t("pages.roadmap.generated", { date: new Date(roadmap.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) })}
              </p>
            )}
          </div>
          <Button onClick={downloadMarkdown} variant="outline" size="sm" className="flex-shrink-0">
            <Download className="h-4 w-4 mr-2" /> {t("common.download")}
          </Button>
        </div>

        <PageMotion>
        {/* Stale infographic banner — your roadmap changed since the cached image */}
        {status?.isStale && status.cached && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-5 shadow-sm">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-amber-900">Your roadmap has changed</h3>
                  <span className="text-[11px] text-amber-700">
                    Cached version: {new Date(status.cached.generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  The shareable infographic was generated before your latest edits. Regenerate to make sure
                  what you share matches your current courses, GPA, and IGETC progress.
                  Your existing image stays available until the new one is ready.
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={generateInfographic}
                    disabled={infographicLoading}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {infographicLoading ? (
                      <><KaleonLoader size={16} /> Regenerating…</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" /> Regenerate now</>
                    )}
                  </Button>
                  <a
                    href={status.cached.pngUrl}
                    className="text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
                  >
                    Download the older version instead
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Infographic generator */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-violet-100" />
                <span className="text-xs font-semibold uppercase tracking-wide text-violet-100">{t("pages.roadmap.shareableInfographic")}</span>
              </div>
              <h2 className="text-lg font-bold">{t("pages.roadmap.onePageVisual")}</h2>
              <p className="text-xs text-violet-100 mt-1 max-w-md leading-relaxed">
                {t("pages.roadmap.onePageDesc")}
              </p>
              {status?.cached && !status.isStale && (
                <p className="text-[11px] text-violet-100/80 mt-1.5 inline-flex items-center gap-1.5">
                  <Check className="h-3 w-3" />
                  Up to date · generated {new Date(status.cached.generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            {!infographicReady ? (
              <Button
                onClick={generateInfographic}
                disabled={infographicLoading}
                size="sm"
                className="bg-white text-indigo-700 hover:bg-violet-50"
              >
                {infographicLoading ? (
                  <><KaleonLoader size={16} /> {t("common.generating")}</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> {t("pages.roadmap.generateInfographic")}</>
                )}
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex gap-2">
                  <Button onClick={() => downloadInfographic("png")} size="sm" className="bg-white text-indigo-700 hover:bg-violet-50">
                    <ImageIcon className="h-4 w-4 mr-2" /> PNG
                  </Button>
                  <Button onClick={() => downloadInfographic("pdf")} size="sm" className="bg-white text-indigo-700 hover:bg-violet-50">
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </Button>
                  <Button onClick={generateInfographic} disabled={infographicLoading} size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10 bg-transparent">
                    {infographicLoading ? <KaleonLoader size={16} /> : t("common.refresh")}
                  </Button>
                </div>
                {status?.cached && (
                  <p className={`text-[11px] ${status.isStale ? "text-amber-200" : "text-violet-100/80"}`}>
                    {status.isStale
                      ? `Downloading cached version from ${new Date(status.cached.generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                      : `Current version · ${new Date(status.cached.generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Share link */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Link2 className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900">Share with a counselor or friend</h3>
                {shareUrl && shareExpiresAt && (
                  <span className="text-[11px] text-slate-400">
                    Expires {new Date(shareExpiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                A short link that opens a mobile-friendly preview of your infographic — no login needed.
              </p>

              {!shareUrl ? (
                <Button
                  onClick={createShareLink}
                  disabled={shareBusy}
                  size="sm"
                  className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {shareBusy ? <KaleonLoader size={16} /> : <Link2 className="h-4 w-4 mr-2" />}
                  Create share link
                </Button>
              ) : (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 text-xs font-mono px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
                    aria-label="Share link"
                  />
                  <Button
                    onClick={() => copyToClipboard(shareUrl)}
                    size="sm"
                    variant="outline"
                    disabled={shareBusy}
                  >
                    {copyState === "copied"
                      ? <><Check className="h-4 w-4 mr-1.5 text-emerald-600" /> Copied</>
                      : <><Copy className="h-4 w-4 mr-1.5" /> Copy</>}
                  </Button>
                  <Button
                    onClick={revokeShareLink}
                    size="sm"
                    variant="ghost"
                    disabled={shareBusy}
                    className="text-slate-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4 mr-1" /> Revoke
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            {t("pages.roadmap.disclaimer")}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-5 mb-5 px-1 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Square className="h-3.5 w-3.5 text-slate-300" /> {t("common.pending")}</span>
          <span className="flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> {t("common.done")}</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> {t("pages.roadmap.legendActionStep")}</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> {t("pages.roadmap.legendNote")}</span>
        </div>

        {/* Content */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 md:px-10 py-8 mb-6">
          <MarkdownContent
            markdown={roadmap.contentMarkdown ?? "No content available."}
            setSection={setCurrentSection}
          />
        </div>

        {/* Download button */}
        <div className="text-center pb-12">
          <Button onClick={downloadMarkdown} variant="outline">
            <Download className="h-4 w-4 mr-2" /> {t("pages.roadmap.downloadRoadmap")}
          </Button>
        </div>
        </PageMotion>
    </AppPageLayout>
  );
}
