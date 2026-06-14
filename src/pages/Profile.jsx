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
    { label: 'Predictions', value: stats?.totalPredictions ?? 0, color: 'var(--c-t1)' },
    { label: 'Correct',     value: stats?.correctPredictions ?? 0, color: 'var(--c-green)' },
    { label: 'Accuracy',    value: `${(stats?.accuracyPercentage ?? 0).toFixed(1)}%`, color: 'var(--c-primary)' },
    { label: 'Points',      value: stats?.totalPoints ?? 0, color: 'var(--c-gold)' },
  ];

  const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-7 space-y-5 animate-fade-in">
      {/* Profile hero */}
      <div
        className="rounded-2xl p-7 flex flex-col items-center text-center"
        style={{
          background: 'linear-gradient(160deg, var(--c-primary-bg) 0%, var(--c-card) 100%)',
          border: '1px solid var(--c-primary-bd)',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <div className="relative mb-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-20 h-20 rounded-full"
              style={{
                border: '3px solid var(--c-primary-bd)',
                boxShadow: '0 0 28px var(--c-primary-bg)',
              }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)',
                color: '#fff',
                boxShadow: '0 0 28px var(--c-primary-bg)',
              }}
            >
              {user.displayName?.[0] || '?'}
            </div>
          )}
          {rankMedal && (
            <div className="absolute -bottom-1 -right-1 text-xl">{rankMedal}</div>
          )}
        </div>
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--c-t1)' }}>{user.displayName}</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--c-t2)' }}>{user.email}</p>
        <div className="flex items-center gap-2.5 mt-4 flex-wrap justify-center">
          {rank != null && (
            <span
              className="text-[12px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'var(--c-gold-bg)', border: '1px solid var(--c-gold-bd)', color: 'var(--c-gold)' }}
            >
              Rank #{rank}
            </span>
          )}
          {user.isAdmin && (
            <span
              className="text-[12px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}
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
            style={{
              background: 'var(--c-card)',
              border: '1px solid var(--c-border)',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            <div className="text-[24px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] mt-0.5 uppercase tracking-wide" style={{ color: 'var(--c-t3)' }}>
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
          style={{
            background: 'var(--c-gold-bg)',
            border: '1px solid var(--c-gold-bd)',
            transition: 'background 0.2s, border-color 0.2s',
          }}
        >
          <span className="text-[14px] font-semibold" style={{ color: 'var(--c-gold)' }}>⚙️ Admin Panel</span>
          <span style={{ color: 'var(--c-gold)' }}>→</span>
        </Link>
      )}

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl text-[14px] font-semibold transition-all duration-200"
        style={{ background: 'var(--c-red-bg)', border: '1px solid var(--c-red-bd)', color: 'var(--c-red)', opacity: 0.7 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
      >
        Sign Out
      </button>
    </div>
  );
}
