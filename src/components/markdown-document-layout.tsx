import { type ReactNode } from "react";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { MarkdownContent } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import type { MarkdownDocument } from "@/types/markdown-document";

export function downloadMarkdownFile(
  content: string,
  filename: string,
): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface MarkdownDocumentNotFoundProps {
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function MarkdownDocumentNotFound({
  message,
  icon,
  action,
}: MarkdownDocumentNotFoundProps) {
  return (
    <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
      <div className="text-center">
        {icon}
        <p className="text-slate-500">{message}</p>
        {action}
      </div>
    </div>
  );
}

interface MarkdownDocumentLayoutProps {
  document: MarkdownDocument | null;
  loading: boolean;
  loadingMessage?: string;
  notFoundMessage: string;
  notFoundIcon?: ReactNode;
  notFoundAction?: ReactNode;
  profileId?: number;
  header: ReactNode;
  footer?: ReactNode;
  markdownFallback: string;
  setSection?: (section: string) => void;
  beforeContent?: ReactNode;
  afterContent?: ReactNode;
}

export function MarkdownDocumentLayout({
  document,
  loading,
  loadingMessage,
  notFoundMessage,
  notFoundIcon,
  notFoundAction,
  profileId,
  header,
  footer,
  markdownFallback,
  setSection,
  beforeContent,
  afterContent,
}: MarkdownDocumentLayoutProps) {
  if (loading) {
    return <PageLoadingState message={loadingMessage} />;
  }

  if (!document) {
    return (
      <MarkdownDocumentNotFound
        message={notFoundMessage}
        icon={notFoundIcon}
        action={notFoundAction}
      />
    );
  }

  return (
    <AppPageLayout profileId={document.profileId ?? profileId} maxWidth="3xl">
      {header}
      {beforeContent}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 md:px-10 py-8 mb-12">
        <MarkdownContent
          markdown={document.contentMarkdown ?? markdownFallback}
          setSection={setSection}
        />
      </div>
      {afterContent}
      {footer}
    </AppPageLayout>
  );
}

export function MarkdownDocumentBackButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" onClick={onClick} className="mt-4">
      {label}
    </Button>
  );
}
