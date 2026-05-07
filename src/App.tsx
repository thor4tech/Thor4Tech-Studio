/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import VideoDetail from "./pages/VideoDetail";
import Upload from "./pages/Upload";
import Editors from "./pages/Editors";
import Settings from "./pages/Settings";
import { Toaster } from "./components/ui/sonner";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, appUser, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user || !appUser) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} />;
  if (allowedRoles && !allowedRoles.includes(appUser.role)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function DefaultHome() {
  const { user, appUser } = useAuth();
  if (!user || !appUser) return <Navigate to="/login" />;
  if (appUser.role === 'admin') return <Navigate to="/dashboard" />;
  return <Navigate to="/clients" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DefaultHome />} />
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:slug" element={<ClientDetail />} />
            <Route path="clients/:slug/videos/:videoId" element={<VideoDetail />} />
            <Route path="upload" element={<Upload />} />
            <Route path="settings" element={<Settings />} />
            <Route path="editors" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Editors />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}
