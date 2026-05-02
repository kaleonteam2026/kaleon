import { type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Sign in to continue</h2>
          <p className="text-slate-500 text-sm">You need to be signed in to access this page.</p>
          <Button onClick={login} className="bg-indigo-600 hover:bg-indigo-700">
            Sign in with Replit
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
