import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLoadingState } from "@/components/page-loading-state";
import { ErrorBoundary } from "@/components/error-boundary";
import ChatBubble from "@/components/chat-bubble";
import SupabaseAuthModal from "@/components/supabase-auth-modal";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import ProtectedRoute from "@/components/protected-route";

const Landing = lazy(() => import("@/pages/landing"));
const Profile = lazy(() => import("@/pages/profile"));
const Courses = lazy(() => import("@/pages/courses"));
const Matches = lazy(() => import("@/pages/matches"));
const Pathways = lazy(() => import("@/pages/pathways"));
const Guidebook = lazy(() => import("@/pages/guidebook"));
const Roadmap = lazy(() => import("@/pages/roadmap"));
const Progress = lazy(() => import("@/pages/progress"));
const DeadlineCalendar = lazy(() => import("@/pages/deadline-calendar"));
const ExportsPage = lazy(() => import("@/pages/exports"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const AuthPage = lazy(() => import("@/pages/auth"));
const Welcome = lazy(() => import("@/pages/welcome"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ChatBubbleWrapper() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return null;
  if (
    location === "/" ||
    location === "/onboarding" ||
    location.startsWith("/onboarding/")
  ) {
    return null;
  }
  return <ChatBubble userId={user?.id} />;
}

function Router() {

  const routes = (
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/welcome/first-gen">
              <ErrorBoundary><Welcome persona="first-gen" /></ErrorBoundary>
            </Route>
            <Route path="/welcome/ab540">
              <ErrorBoundary><Welcome persona="ab540" /></ErrorBoundary>
            </Route>
            <Route path="/welcome/returning">
              <ErrorBoundary><Welcome persona="returning" /></ErrorBoundary>
            </Route>
            <Route path="/onboarding">
              <ErrorBoundary>
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route path="/profile/:profileId?">
              <ErrorBoundary>
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route path="/courses/:profileId">
              <ErrorBoundary>
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route path="/matches/:profileId">
              <ErrorBoundary>
                <ProtectedRoute>
                  <Matches />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route path="/pathways/:profileId">
              <ErrorBoundary>
                <ProtectedRoute>
                  <Pathways />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route path="/guidebook/:guidebookId">
              <ErrorBoundary>
                <ProtectedRoute>
                  <Guidebook />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route path="/roadmap/:roadmapId">
              <ErrorBoundary>
                <ProtectedRoute>
                  <Roadmap />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route path="/progress/:profileId">
              <ErrorBoundary>
                <ProtectedRoute>
                  <Progress />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route path="/deadline-calendar/:profileId?">
              <ErrorBoundary>
                <ProtectedRoute>
                  <DeadlineCalendar />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route path="/exports/:profileId?">
              <ErrorBoundary>
                <ProtectedRoute>
                  <ExportsPage />
                </ProtectedRoute>
              </ErrorBoundary>
            </Route>
            <Route component={NotFound} />
          </Switch>
  );

  return (
    <>
      {routes}
      <ChatBubbleWrapper />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <SupabaseAuthModal />
            <Suspense fallback={<PageLoadingState variant="dark" message="Loading…" />}>
              <ErrorBoundary variant="page">
                <Router />
              </ErrorBoundary>
            </Suspense>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
