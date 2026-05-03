import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import ShareRoadmap from "@/pages/share-roadmap";
import Progress from "@/pages/progress";
import Internships from "@/pages/internships";
import DeadlineCalendar from "@/pages/deadline-calendar";
import DreamAct from "@/pages/dream-act";
import Scholarships from "@/pages/scholarships";
import TagChecker from "@/pages/tag-checker";
import IgetcTracker from "@/pages/igetc";
import ExportsPage from "@/pages/exports";
import AdminUsage from "@/pages/admin-usage";
import AdminSeoConversions from "@/pages/admin-seo-conversions";
import Onboarding from "@/pages/onboarding";
import Welcome from "@/pages/welcome";
import ChatBubble from "@/components/chat-bubble";
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
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return null;
  return <ChatBubble userId={user?.id} />;
}

function Router() {
  const [location] = useLocation();
  const reduced = useReducedMotion();
  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location}
          initial={reduced ? false : { opacity: 0 }}
          animate={reduced ? undefined : { opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/s/:token" component={ShareRoadmap} />
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
        <Route path="/internships/:profileId">
          <ProtectedRoute>
            <Internships />
          </ProtectedRoute>
        </Route>
        <Route path="/deadline-calendar/:profileId?">
          <ProtectedRoute>
            <DeadlineCalendar />
          </ProtectedRoute>
        </Route>
        <Route path="/dream-act">
          <ProtectedRoute>
            <DreamAct />
          </ProtectedRoute>
        </Route>
        <Route path="/scholarships/:profileId?">
          <ProtectedRoute>
            <Scholarships />
          </ProtectedRoute>
        </Route>
        <Route path="/tag-checker/:profileId?">
          <ProtectedRoute>
            <TagChecker />
          </ProtectedRoute>
        </Route>
        <Route path="/igetc/:profileId">
          <ProtectedRoute>
            <IgetcTracker />
          </ProtectedRoute>
        </Route>
        <Route path="/exports/:profileId?">
          <ProtectedRoute>
            <ExportsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/usage" component={AdminUsage} />
        <Route path="/admin/seo-conversions" component={AdminSeoConversions} />
        <Route component={NotFound} />
      </Switch>
        </motion.div>
      </AnimatePresence>
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
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
