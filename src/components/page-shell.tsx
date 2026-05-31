import { type ReactNode } from "react";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";

type PageShellMaxWidth = "narrow" | "default" | "wide";

interface PageShellProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  profileId?: number;
  children: ReactNode;
  maxWidth?: PageShellMaxWidth;
}

const SHELL_MAX_WIDTH = {
  narrow: "3xl",
  default: "5xl",
  wide: "wide",
} as const;

export function PageShell({
  title,
  subtitle,
  action,
  profileId,
  children,
  maxWidth = "default",
}: PageShellProps) {
  return (
    <AppPageLayout
      variant="dark"
      profileId={profileId}
      maxWidth={SHELL_MAX_WIDTH[maxWidth]}
      title={title}
      subtitle={subtitle}
      action={action}
    >
      {children}
    </AppPageLayout>
  );
}

export function LoadingShell() {
  return <PageLoadingState variant="dark" />;
}
