import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Matches from './pages/Matches';
import MyPredictions from './pages/MyPredictions';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import AdminPanel from './pages/admin/AdminPanel';

function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--c-page)', transition: 'background 0.2s ease' }}>
      <Navbar />
      <main className="pb-24 md:pb-0">{children}</main>
    </div>
  );
}

// Shows Landing page for guests, Dashboard for authenticated users
function SmartRoot() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--c-page)' }}
      >
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Layout><Dashboard /></Layout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            {/* Public root — Landing for guests, Dashboard for logged-in */}
            <Route path="/" element={<SmartRoot />} />

            {/* Auth page */}
            <Route path="/login" element={<Login />} />

            {/* Protected pages */}
            <Route path="/matches"        element={<ProtectedRoute><Layout><Matches /></Layout></ProtectedRoute>} />
            <Route path="/my-predictions" element={<ProtectedRoute><Layout><MyPredictions /></Layout></ProtectedRoute>} />
            <Route path="/leaderboard"    element={<ProtectedRoute><Layout><Leaderboard /></Layout></ProtectedRoute>} />
            <Route path="/profile"        element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
            <Route path="/admin"          element={<ProtectedRoute adminOnly><Layout><AdminPanel /></Layout></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
