import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Courses from "@/pages/courses";
import Matches from "@/pages/matches";
import Pathways from "@/pages/pathways";
import Guidebook from "@/pages/guidebook";
import Roadmap from "@/pages/roadmap";
import Progress from "@/pages/progress";
import DeadlineCalendar from "@/pages/deadline-calendar";
import ExportsPage from "@/pages/exports";
import Onboarding from "@/pages/onboarding";
import AuthPage from "@/pages/auth";
import Welcome from "@/pages/welcome";
import ChatBubble from "@/components/chat-bubble";
import SupabaseAuthModal from "@/components/supabase-auth-modal";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import ProtectedRoute from "@/components/protected-route";

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
  const [location] = useLocation();
  const reduced = useReducedMotion();
  const animateRoutes = !reduced;

  const routes = (
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/welcome/first-gen">
              <Welcome persona="first-gen" />
            </Route>
            <Route path="/welcome/ab540">
              <Welcome persona="ab540" />
            </Route>
            <Route path="/welcome/returning">
              <Welcome persona="returning" />
            </Route>
            <Route path="/dashboard">
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/onboarding">
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            </Route>
            <Route path="/profile/:profileId?">
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            </Route>
            <Route path="/courses/:profileId">
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            </Route>
            <Route path="/matches/:profileId">
              <ProtectedRoute>
                <Matches />
              </ProtectedRoute>
            </Route>
            <Route path="/pathways/:profileId">
              <ProtectedRoute>
                <Pathways />
              </ProtectedRoute>
            </Route>
            <Route path="/guidebook/:guidebookId">
              <ProtectedRoute>
                <Guidebook />
              </ProtectedRoute>
            </Route>
            <Route path="/roadmap/:roadmapId">
              <ProtectedRoute>
                <Roadmap />
              </ProtectedRoute>
            </Route>
            <Route path="/progress/:profileId">
              <ProtectedRoute>
                <Progress />
              </ProtectedRoute>
            </Route>
            <Route path="/deadline-calendar/:profileId?">
              <ProtectedRoute>
                <DeadlineCalendar />
              </ProtectedRoute>
            </Route>
            <Route path="/exports/:profileId?">
              <ProtectedRoute>
                <ExportsPage />
              </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
  );

  return (
    <>
      {animateRoutes ? (
        <motion.div
          key={location}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {routes}
        </motion.div>
      ) : (
        routes
      )}
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
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
