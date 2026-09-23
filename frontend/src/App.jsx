import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';

// Public & Auth Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import JoinQuiz from './pages/JoinQuiz';

// Trainer Pages
import Dashboard from './pages/Dashboard';
import QuizLibrary from './pages/QuizLibrary';
import QuizDetailPage from './pages/QuizDetailPage';
import QuizCreator from './pages/QuizCreator';
import Reports from './pages/Reports';

// Live Quiz HUDs
import LiveHost from './pages/LiveHost';
import LiveParticipant from './pages/LiveParticipant';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/join" element={<JoinQuiz />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Trainer Workspace (Protected) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <QuizLibrary />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes/:id"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <QuizDetailPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/creator"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <QuizCreator />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/quizzes/create" element={<Navigate to="/creator" replace />} />
          <Route path="/questions" element={<Navigate to="/quizzes" replace />} />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Reports />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/analytics" element={<Navigate to="/reports" replace />} />
          <Route path="/admin/sessions" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/settings" element={<Navigate to="/dashboard" replace />} />

          {/* Participant Waiting & Live Experience */}
          <Route path="/waiting/:code" element={<LiveParticipant />} />
          <Route path="/live/participant/:code" element={<LiveParticipant />} />

          {/* Host Live Control Room */}
          <Route path="/live/host/:sessionId" element={<LiveHost />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
