import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GroupProvider, useGroup } from './contexts/GroupContext';
import { HouseProvider } from './contexts/HouseContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

function ScrollButtons() {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setShowTop(scrolled > 250);
      setShowBottom(total > 250 && scrolled < total - 100);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!showTop && !showBottom) return null;

  const btnStyle = {
    width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--c-border)',
    background: 'var(--c-card)', color: 'var(--c-t2)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)', fontSize: 16, transition: 'opacity 0.2s',
  };

  return (
    <div style={{ position: 'fixed', right: 14, bottom: 110, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {showTop && (
        <button style={btnStyle} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Scroll to top">
          ↑
        </button>
      )}
      {showBottom && (
        <button style={btnStyle} onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })} title="Scroll to bottom">
          ↓
        </button>
      )}
    </div>
  );
}

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Matches from './pages/Matches';
import MyPredictions from './pages/MyPredictions';
import Leaderboard from './pages/Leaderboard';
import KnockoutLeaderboard from './pages/KnockoutLeaderboard';
import Profile from './pages/Profile';
import GroupAdmin from './pages/GroupAdmin';
import GroupSelect from './pages/GroupSelect';
import Polls from './pages/Polls';
import Discover from './pages/Discover';
import Activity from './pages/Activity';
import MatchStats from './pages/MatchStats';
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
      <ScrollButtons />
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

  if (!user) return <Navigate to="/discover" replace />;
  return <Layout><Dashboard /></Layout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GroupProvider>
        <HouseProvider>
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
              <Route path="/knockout-leaderboard" element={<ProtectedRoute><Layout><KnockoutLeaderboard /></Layout></ProtectedRoute>} />
              <Route path="/profile"              element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
              <Route path="/profile/:uid"         element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
              <Route path="/polls"                element={<ProtectedRoute><Layout><Polls /></Layout></ProtectedRoute>} />
              <Route path="/activity"            element={<ProtectedRoute><Layout><Activity /></Layout></ProtectedRoute>} />
              <Route path="/match-stats"        element={<ProtectedRoute><Layout><MatchStats /></Layout></ProtectedRoute>} />
              <Route path="/group-admin/:groupId" element={<ProtectedRoute><Layout><GroupAdmin /></Layout></ProtectedRoute>} />
              <Route path="/admin"                element={<ProtectedRoute adminOnly><Layout><AdminPanel /></Layout></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </HouseProvider>
        </GroupProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
