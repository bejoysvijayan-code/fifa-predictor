import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUser, getAllUsers } from '../firebase/services';
import { sortLeaderboard } from '../utils/scoring';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [userData, allUsers] = await Promise.all([
        getUser(user.uid),
        getAllUsers(),
      ]);
      setStats(userData);
      const sorted = sortLeaderboard(allUsers.filter((u) => !u.hideFromLeaderboard));
      const idx = sorted.findIndex((u) => u.uid === user.uid);
      setRank(idx >= 0 ? idx + 1 : null);
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  const statItems = [
    { label: 'Predictions', value: stats?.totalPredictions ?? 0, color: 'rgba(255,255,255,0.78)' },
    { label: 'Correct', value: stats?.correctPredictions ?? 0, color: '#4ADE80' },
    { label: 'Accuracy', value: `${(stats?.accuracyPercentage ?? 0).toFixed(1)}%`, color: '#8B9CFF' },
    { label: 'Points', value: stats?.totalPoints ?? 0, color: '#F0B429' },
  ];

  const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-7 space-y-5 animate-fade-in">
      {/* Profile hero */}
      <div
        className="rounded-2xl p-7 flex flex-col items-center text-center"
        style={{
          background: 'linear-gradient(160deg, rgba(91,108,248,0.12) 0%, rgba(13,13,26,0.95) 100%)',
          border: '1px solid rgba(91,108,248,0.18)',
        }}
      >
        <div className="relative mb-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-20 h-20 rounded-full"
              style={{
                border: '3px solid rgba(91,108,248,0.4)',
                boxShadow: '0 0 28px rgba(91,108,248,0.25)',
              }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)',
                boxShadow: '0 0 28px rgba(91,108,248,0.3)',
              }}
            >
              {user.displayName?.[0] || '?'}
            </div>
          )}
          {rankMedal && (
            <div className="absolute -bottom-1 -right-1 text-xl">{rankMedal}</div>
          )}
        </div>
        <h1 className="text-[20px] font-bold" style={{ color: '#E8EAFF' }}>{user.displayName}</h1>
        <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{user.email}</p>
        <div className="flex items-center gap-2.5 mt-4 flex-wrap justify-center">
          {rank != null && (
            <span
              className="text-[12px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(240,180,41,0.12)', border: '1px solid rgba(240,180,41,0.25)', color: '#F0B429' }}
            >
              Rank #{rank}
            </span>
          )}
          {user.isAdmin && (
            <span
              className="text-[12px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(91,108,248,0.12)', border: '1px solid rgba(91,108,248,0.25)', color: '#8B9CFF' }}
            >
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 text-center"
            style={{ background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="text-[24px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] mt-0.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Admin link */}
      {user.isAdmin && (
        <Link
          to="/admin"
          className="flex items-center justify-between w-full rounded-2xl px-5 py-4 transition-opacity hover:opacity-80"
          style={{ background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.18)' }}
        >
          <span className="text-[14px] font-semibold" style={{ color: '#F0B429' }}>⚙️ Admin Panel</span>
          <span style={{ color: 'rgba(240,180,41,0.45)' }}>→</span>
        </Link>
      )}

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl text-[14px] font-semibold transition-all duration-200"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(239,68,68,0.65)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
          e.currentTarget.style.color = '#EF4444';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
          e.currentTarget.style.color = 'rgba(239,68,68,0.65)';
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
