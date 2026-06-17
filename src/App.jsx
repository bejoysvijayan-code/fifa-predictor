import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GroupProvider, useGroup } from './contexts/GroupContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Matches from './pages/Matches';
import MyPredictions from './pages/MyPredictions';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import GroupAdmin from './pages/GroupAdmin';
import GroupSelect from './pages/GroupSelect';
import Polls from './pages/Polls';
import Discover from './pages/Discover';
import Activity from './pages/Activity';
import AdminPanel from './pages/admin/AdminPanel';

function Layout({ children }) {
  const { user } = useAuth();
  const { myGroups, activeGroup, loading: groupLoading } = useGroup();
  const location = useLocation();

  // Redirect to group chooser only when user has 2+ groups and hasn't picked one yet
  if (
    !groupLoading &&
    !user?.isAdmin &&
    myGroups.length > 1 &&
    !activeGroup &&
    location.pathname !== '/choose-group'
  ) {
    return <Navigate to="/choose-group" replace />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--c-page)', transition: 'background 0.2s ease' }}>
      <Navbar />
      <main className="pb-24 md:pb-0">{children}</main>
    </div>
  );
}

function SmartRoot() {
  const { user, loading: authLoading } = useAuth();
  const { loading: groupLoading } = useGroup();

  if (authLoading || groupLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--c-page)' }}>
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
        <GroupProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<SmartRoot />} />
              <Route path="/login" element={<Login />} />
              <Route path="/discover" element={<Discover />} />

              {/* Group chooser — protected but no Layout (full-screen standalone) */}
              <Route path="/choose-group" element={<ProtectedRoute><GroupSelect /></ProtectedRoute>} />

              {/* Protected pages inside Layout */}
              <Route path="/matches"              element={<ProtectedRoute><Layout><Matches /></Layout></ProtectedRoute>} />
              <Route path="/my-predictions"       element={<ProtectedRoute><Layout><MyPredictions /></Layout></ProtectedRoute>} />
              <Route path="/leaderboard"          element={<ProtectedRoute><Layout><Leaderboard /></Layout></ProtectedRoute>} />
              <Route path="/profile"              element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
              <Route path="/profile/:uid"         element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
              <Route path="/polls"                element={<ProtectedRoute><Layout><Polls /></Layout></ProtectedRoute>} />
              <Route path="/activity"            element={<ProtectedRoute><Layout><Activity /></Layout></ProtectedRoute>} />
              <Route path="/group-admin/:groupId" element={<ProtectedRoute><Layout><GroupAdmin /></Layout></ProtectedRoute>} />
              <Route path="/admin"                element={<ProtectedRoute adminOnly><Layout><AdminPanel /></Layout></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </GroupProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
