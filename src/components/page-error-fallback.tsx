import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  variant?: "page" | "section";
}

export function PageErrorFallback({ error, resetErrorBoundary, variant = "page" }: PageErrorFallbackProps) {
  const isPage = variant === "page";
  return (
    <div className={`flex flex-col items-center justify-center ${isPage ? "min-h-[60vh]" : "py-12"} px-6 text-center`}>
      <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center mb-5">
        <AlertCircle className="h-8 w-8 text-rose-500" />
      </div>
      <h2 className={`font-bold text-slate-900 ${isPage ? "text-xl mb-2" : "text-base mb-1.5"}`}>
        Something went wrong
      </h2>
      <p className="text-sm text-slate-600 max-w-md mb-4">
        This section encountered an unexpected error. Try refreshing the page or come back later.
      </p>
      {error && (
        <details className="mb-4 max-w-md text-left">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 font-mono">
            Error details
          </summary>
          <pre className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 overflow-auto max-h-32 font-mono">
            {error.message}
          </pre>
        </details>
      )}
      {resetErrorBoundary && (
        <Button onClick={resetErrorBoundary} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
      {!resetErrorBoundary && (
        <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh page
        </Button>
      )}
    </div>
  );
}
