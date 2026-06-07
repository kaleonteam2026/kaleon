import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Download, BookOpen, AlertTriangle,
  CheckSquare, Square, CheckCircle2,
} from "lucide-react";
import { PageMotion } from "@/components/page-motion";
import { CopyTrans } from "@/components/copy-trans";
import { t } from "@/lib/copy";
import type { Guidebook } from "@/types/markdown-document";
import {
  downloadMarkdownFile,
  MarkdownDocumentLayout,
  MarkdownDocumentBackButton,
} from "@/components/markdown-document-layout";
import { loadGuidebook } from "@/lib/supabase-documents";

export default function Guidebook() {
  const { guidebookId } = useParams<{ guidebookId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [guidebook, setGuidebook] = useState<Guidebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setCurrentSection] = useState("");
  const gid = parseInt(guidebookId);
  void navigate;

  useEffect(() => {
    loadGuidebook(gid).then((doc) => {
      if (doc) {
        setGuidebook({
          id: doc.id,
          title: doc.title,
          contentMarkdown: doc.contentMarkdown,
          createdAt: doc.createdAt,
          profileId: doc.profileId,
        });
      }
    }).catch(() => {
      toast({ title: t("pages.guidebook.toast_loadError"), variant: "destructive" });
    }).finally(() => setLoading(false));
  }, [gid, toast]);

  const downloadMarkdown = () => {
    if (!guidebook?.contentMarkdown) return;
    downloadMarkdownFile(guidebook.contentMarkdown, `dyp-guidebook-${guidebook.id}.md`);
    toast({ title: t("pages.guidebook.toast_downloaded") });
  };

  return (
    <MarkdownDocumentLayout
      document={guidebook}
      loading={loading}
      loadingMessage={t("pages.guidebook.loading")}
      notFoundMessage={t("pages.guidebook.notFound")}
      notFoundIcon={<BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />}
      notFoundAction={
        <MarkdownDocumentBackButton
          label={t("pages.guidebook.goBack")}
          onClick={() => window.history.back()}
        />
      }
      markdownFallback={t("pages.guidebook.noContent")}
      setSection={setCurrentSection}
      header={
        <div className="py-6 flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {t("pages.guidebook.back")}
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-tight">
              {guidebook?.title ?? t("pages.guidebook.titleFallback")}
            </h1>
            {guidebook?.createdAt && (
              <p className="text-xs text-slate-400 mt-1">
                {t("pages.guidebook.generatedOn", {
                  date: new Date(guidebook.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }),
                })}
              </p>
            )}
          </div>
          <Button onClick={downloadMarkdown} variant="outline" size="sm" className="flex-shrink-0">
            <Download className="h-4 w-4 mr-2" /> {t("pages.guidebook.download")}
          </Button>
        </div>
      }
      beforeContent={
        <PageMotion>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <CopyTrans i18nKey="pages.guidebook.disclaimer" components={{ strong: <strong /> }} />
            </p>
          </div>
          <div className="flex flex-wrap gap-5 mb-5 px-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Square className="h-3.5 w-3.5 text-slate-300" /> {t("pages.guidebook.legend_pending")}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> {t("pages.guidebook.legend_done")}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> {t("pages.guidebook.legend_action")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />{" "}
              {t("pages.guidebook.legend_note")}
            </span>
          </div>
        </PageMotion>
      }
      footer={
        <PageMotion>
          <div className="text-center pb-12">
            <Button onClick={downloadMarkdown} variant="outline">
              <Download className="h-4 w-4 mr-2" /> {t("pages.guidebook.downloadFull")}
            </Button>
            <p className="text-xs text-slate-400 mt-3">{t("pages.guidebook.footer")}</p>
          </div>
        </PageMotion>
      }
    />
  );
}
