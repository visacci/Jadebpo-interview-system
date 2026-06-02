import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Careers from "./pages/Careers";
import Index from "./pages/Index";
import CreateJob from "./pages/CreateJob";
import JobApplications from "./pages/JobApplications";
import ApplicationDetail from "./pages/ApplicationDetail";
import ApplicationForm from "./pages/ApplicationForm";
import AptitudeTest from "./pages/AptitudeTest";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewFlow from "./pages/InterviewFlow";
import Results from "./pages/Results";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import PendingInterviews from "./pages/PendingInterviews";
import JobDetails from "./pages/JobDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Careers />} />
            <Route path="/careers/:jobId" element={<JobDetails />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/apply/:jobId" element={<ApplicationForm />} />
            <Route path="/aptitude/:applicationId" element={<AptitudeTest />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/jobs/create" element={<ProtectedRoute><CreateJob /></ProtectedRoute>} />
            <Route path="/jobs/:jobId" element={<ProtectedRoute><JobApplications /></ProtectedRoute>} />
            <Route path="/jobs/:jobId/applications/:applicationId" element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>} />
            <Route path="/interview/setup" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
            <Route path="/interview/session/:sessionId" element={<ProtectedRoute><InterviewFlow /></ProtectedRoute>} />
            <Route path="/interview/pending" element={<ProtectedRoute><PendingInterviews /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
