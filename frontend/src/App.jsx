import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useSelector, useDispatch } from "react-redux";
import { refreshUser } from "./features/auth/authSlice";
import { initializeSocket, disconnectSocket } from "./socket/socketClient";

// ============================================
// LAZY LOADED PAGE COMPONENTS
// Code-splitting: Each page loads only when navigated to
// ============================================

// Auth pages (kept eager for fast initial load)
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

// Admin pages
const AdminDashboard = lazy(() => import("./pages/dashboards/AdminDashboard"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const RecentActivity = lazy(() => import("./pages/admin/RecentActivity"));
const ReviewStatus = lazy(() => import("./pages/admin/ReviewStatus"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));

// Reviewer pages
const ReviewerDashboard = lazy(() => import("./pages/dashboards/ReviewerDashboard"));
const Availability = lazy(() => import("./pages/reviewer/Availability"));
const ReviewRequests = lazy(() => import("./pages/reviewer/ReviewRequests"));
const ReviewSession = lazy(() => import("./pages/reviewer/ReviewSession"));
const History = lazy(() => import("./pages/reviewer/History"));
const Performance = lazy(() => import("./pages/reviewer/Performance"));
const ReviewerChat = lazy(() => import("./pages/reviewer/Chat"));
const ReviewerProfile = lazy(() => import("./pages/reviewer/Profile"));

// Student pages
const StudentDashboard = lazy(() => import("./pages/dashboards/StudentDashboard"));
const Reviews = lazy(() => import("./pages/student/Reviews"));
const Progress = lazy(() => import("./pages/student/Progress"));
const Tasks = lazy(() => import("./pages/student/Tasks"));
const StudyMaterials = lazy(() => import("./pages/student/StudyMaterials"));
const Chat = lazy(() => import("./pages/student/Chat"));
const IssuesSuggestions = lazy(() => import("./pages/student/IssuesSuggestions"));
const Notifications = lazy(() => import("./pages/student/Notifications"));
const StudentProfile = lazy(() => import("./pages/student/Profile"));

// Advisor pages
const AdvisorDashboard = lazy(() => import("./pages/dashboards/AdvisorDashboard"));
const AdvisorStudents = lazy(() => import("./pages/advisor/Students"));
const AdvisorReviews = lazy(() => import("./pages/advisor/Reviews"));
const AdvisorReviewerAvailability = lazy(() => import("./pages/advisor/ReviewerAvailability"));
const AdvisorCalendar = lazy(() => import("./pages/advisor/Calendar"));
const AdvisorNotes = lazy(() => import("./pages/advisor/Notes"));
const AdvisorAnalytics = lazy(() => import("./pages/advisor/ReportsAnalytics"));
const AdvisorProfile = lazy(() => import("./pages/advisor/Profile"));
const AdvisorChat = lazy(() => import("./pages/advisor/Chat"));
const AdvisorIssues = lazy(() => import("./pages/advisor/Issues"));
const AdvisorTasks = lazy(() => import("./pages/advisor/Tasks"));

// Shared pages
const ReviewRoom = lazy(() => import("./pages/shared/ReviewRoom"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm text-slate-500">Loading...</span>
    </div>
  </div>
);

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);

  // Refresh user profile from backend on app load
  useEffect(() => {
    if (isAuthenticated && user) {
      dispatch(refreshUser());
    }
  }, [isAuthenticated, dispatch]);

  // Initialize Socket.IO when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      const socket = initializeSocket(token);
      console.log("🔌 Socket initialized for user:", user?.name);

      // Cleanup on logout
      return () => {
        disconnectSocket();
      };
    }
  }, [isAuthenticated, token]);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ROOT ROUTE */}
          <Route
            path="/"
            element={
              isAuthenticated && user ? (
                user.role === "admin" ? (
                  <Navigate to="/admin/dashboard" replace />
                ) : user.role === "reviewer" ? (
                  <Navigate to="/reviewer/dashboard" replace />
                ) : user.role === "student" ? (
                  <Navigate to="/student/dashboard" replace />
                ) : user.role === "advisor" ? (
                  <Navigate to="/advisor/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* LOGIN & AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ADMIN */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-users"
            element={
              <ProtectedRoute role="admin">
                <Layout>
                  <ManageUsers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/recent-activity"
            element={
              <ProtectedRoute role="admin">
                <Layout>
                  <RecentActivity />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/review-status"
            element={
              <ProtectedRoute role="admin">
                <Layout>
                  <ReviewStatus />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute role="admin">
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute role="admin">
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute role="admin">
                <Layout>
                  <AdminNotifications />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* REVIEWER */}
          <Route
            path="/reviewer/dashboard"
            element={
              <ProtectedRoute role="reviewer">
                <Layout>
                  <ReviewerDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/availability"
            element={
              <ProtectedRoute role="reviewer">
                <Layout>
                  <Availability />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/requests"
            element={
              <ProtectedRoute role="reviewer">
                <Layout>
                  <ReviewRequests />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/session"
            element={
              <ProtectedRoute role="reviewer">
                <Layout>
                  <ReviewSession />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/history"
            element={
              <ProtectedRoute role="reviewer">
                <Layout>
                  <History />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/performance"
            element={
              <ProtectedRoute role="reviewer">
                <Layout>
                  <Performance />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/chat"
            element={
              <ProtectedRoute role="reviewer">
                <Layout>
                  <ReviewerChat />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/profile"
            element={
              <ProtectedRoute role="reviewer">
                <Layout>
                  <ReviewerProfile />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* STUDENT */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute role="student">
                <Layout>
                  <StudentDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/reviews"
            element={
              <ProtectedRoute role="student">
                <Layout>
                  <Reviews />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/progress"
            element={
              <ProtectedRoute role="student">
                <Layout>
                  <Progress />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/tasks"
            element={
              <ProtectedRoute role="student">
                <Layout>
                  <Tasks />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/study-materials"
            element={
              <ProtectedRoute role="student">
                <Layout>
                  <StudyMaterials />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/chat"
            element={
              <ProtectedRoute role="student">
                <Layout>
                  <Chat />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/issues"
            element={
              <ProtectedRoute role="student">
                <Layout>
                  <IssuesSuggestions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/notifications"
            element={
              <ProtectedRoute role="student">
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute role="student">
                <Layout>
                  <StudentProfile />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ADVISOR */}
          <Route
            path="/advisor/dashboard"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/students"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorStudents />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/tasks"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorTasks />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/reviews"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorReviews />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/availability"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorReviewerAvailability />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/calendar"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorCalendar />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/chat"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorChat />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/notifications"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorIssues />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/notes"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorNotes />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/analytics"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorAnalytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/advisor/profile"
            element={
              <ProtectedRoute role="advisor">
                <Layout>
                  <AdvisorProfile />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* SHARED - REVIEW ROOM */}
          {/* Accessible by all authenticated users (reviewer, student, advisor) */}
          {/* Future: WebRTC + Socket.IO video call interface */}
          <Route
            path="/review-room/:reviewId"
            element={
              <ProtectedRoute role={["reviewer", "student", "advisor"]}>
                <ReviewRoom />
              </ProtectedRoute>
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
