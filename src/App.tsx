import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { InterviewProvider } from "./context/InterviewContext";
import VideoCall from "./components/VideoCall.jsx";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import CandidateSelect from "./pages/CandidateSelect";
import Interview from "./pages/Interview";
import InterviewReport from "./pages/InterviewReport";
import InterviewDetails from "./pages/InterviewDetails";
import NotAuthorized from "./pages/NotAuthorized";
import NotFound from "./pages/NotFound";
import CreateAdmin from "./pages/CreateAdmin";
import Settings from "./pages/Settings";
import RoleManagement from "./pages/RoleManagement";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ 
  children, 
  requiredRole
}: { 
  children: JSX.Element, 
  requiredRole?: 'admin' | 'user' 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/not-authorized" />;
  }
  
  return children;
};

function VideoCallWrapper() {
  const { interviewId } = useParams();
  return <VideoCall interviewId={interviewId} />;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/not-authorized" element={<NotAuthorized />} />
    <Route 
      path="/settings" 
      element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } 
    />
    
    {/* Admin routes */}
    <Route 
      path="/admin/dashboard" 
      element={
        <ProtectedRoute requiredRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/admin/create" 
      element={
        <ProtectedRoute requiredRole="admin">
          <CreateAdmin />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/admin/tech-stack-roles" 
      element={
        <ProtectedRoute requiredRole="admin">
          <RoleManagement />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/admin/report/:reportId" 
      element={
        <ProtectedRoute requiredRole="admin">
          <InterviewReport />
        </ProtectedRoute>
      } 
    />
    
    {/* Candidate routes */}
    <Route 
      path="/candidate/select" 
      element={
        <ProtectedRoute requiredRole="user">
          <CandidateSelect />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/interview/:interviewId" 
      element={
        <ProtectedRoute>
          <Interview />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/interview-details/:interviewId" 
      element={
        <ProtectedRoute>
          <InterviewDetails />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/video/:interviewId" 
      element={
        <ProtectedRoute>
          <VideoCallWrapper />
        </ProtectedRoute>
      } 
    />
    
    {/* Catch-all route */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <InterviewProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </InterviewProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
