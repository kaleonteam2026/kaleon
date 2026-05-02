import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import Internships from "@/pages/internships";
import DeadlineCalendar from "@/pages/deadline-calendar";
import DreamAct from "@/pages/dream-act";
import Scholarships from "@/pages/scholarships";
import TagChecker from "@/pages/tag-checker";
import IgetcTracker from "@/pages/igetc";
import Onboarding from "@/pages/onboarding";
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
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return <ChatBubble />;
}

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Landing} />
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
        <Route component={NotFound} />
      </Switch>
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
