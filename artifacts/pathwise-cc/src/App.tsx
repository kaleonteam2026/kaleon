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
import Scholarships from "@/pages/scholarships";
import { AuthProvider } from "@/contexts/auth-context";
import ProtectedRoute from "@/components/protected-route";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
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
      <Route path="/scholarships/:profileId?">
        <ProtectedRoute>
          <Scholarships />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
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
