import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { getPublicGroups, getOpenPollsForGroups, joinPublicGroup, logActivity } from '../firebase/services';
import ThemeToggle from '../components/ThemeToggle';

function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GroupCard({ group, activePollCount, isMember, user, onJoin, joining }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)' }}>
          👥
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ background: 'var(--c-green-bg)', color: 'var(--c-green)', border: '1px solid var(--c-green-bd)' }}>
          Public
        </span>
      </div>

      <div>
        <h3 className="text-[15px] font-bold leading-snug" style={{ color: 'var(--c-t1)' }}>{group.name}</h3>
        <p className="text-[12px] mt-1" style={{ color: 'var(--c-t3)' }}>
          {activePollCount > 0
            ? `${activePollCount} active poll${activePollCount !== 1 ? 's' : ''}`
            : 'No active polls'}
        </p>
      </div>

      {isMember ? (
        <Link to="/polls"
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-center transition-all"
          style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}>
          View Polls →
        </Link>
      ) : (
        <button
          onClick={() => onJoin(group.id)}
          disabled={joining === group.id}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60"
          style={{ background: 'var(--c-primary)', color: '#fff' }}
          onMouseEnter={(e) => { if (joining !== group.id) e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {joining === group.id ? 'Joining…' : user ? 'Join & Have Fun' : 'Sign in to Join'}
        </button>
      )}
    </div>
  );
}

function PollCard({ poll, groupName, isMember, user, onJoin, joining }) {
  const previewOptions = poll.options.slice(0, 3);
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow)' }}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}>
          {poll.type === 'prediction' ? '🎯 Prediction' : '📊 Opinion'}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--c-t3)' }}>{groupName}</span>
      </div>

      <p className="text-[14px] font-semibold leading-snug" style={{ color: 'var(--c-t1)' }}>
        {poll.question}
      </p>

      <div className="space-y-1.5">
        {previewOptions.map((opt) => (
          <div key={opt} className="py-1.5 px-3 rounded-lg text-[12px]"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }}>
            {opt}
          </div>
        ))}
        {poll.options.length > 3 && (
          <div className="text-[11px] pl-1" style={{ color: 'var(--c-t3)' }}>
            +{poll.options.length - 3} more options
          </div>
        )}
      </div>

      {isMember ? (
        <Link to="/polls"
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-center transition-all"
          style={{ background: 'var(--c-primary)', color: '#fff' }}>
          Predict Now →
        </Link>
      ) : (
        <button
          onClick={() => onJoin(poll.groupId)}
          disabled={joining === poll.groupId}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60"
          style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}
          onMouseEnter={(e) => { if (joining !== poll.groupId) { e.currentTarget.style.background = 'var(--c-primary)'; e.currentTarget.style.color = '#fff'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-primary-bg)'; e.currentTarget.style.color = 'var(--c-primary)'; }}
        >
          {joining === poll.groupId ? 'Joining…' : user ? 'Join Group & Predict' : 'Sign in to Predict'}
        </button>
      )}
    </div>
  );
}

export default function Discover() {
  const { user, loginWithGoogle } = useAuth();
  const { myGroups } = useGroup();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    async function load() {
      const gs = await getPublicGroups();
      setGroups(gs);
      if (gs.length) {
        const ps = await getOpenPollsForGroups(gs.map((g) => g.id));
        setPolls(ps);
      }
      setLoading(false);
    }
    load();
  }, []);

  const myGroupIds = new Set(myGroups.map((g) => g.id));

  async function handleJoin(groupId) {
    if (!user) {
      navigate('/login?redirect=/discover');
      return;
    }
    setJoining(groupId);
    try {
      await joinPublicGroup(groupId, user.uid);
      logActivity('member_join', {
        userId: user.uid,
        displayName: user.displayName || 'Someone',
        groupId,
        groupName: groups.find((g) => g.id === groupId)?.name || groupId,
      });
      navigate('/polls');
    } catch (e) {
      console.error(e);
      setJoining(null);
    }
  }

  const groupNameMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));

  return (
    <div className="min-h-screen" style={{ background: 'var(--c-page)', transition: 'background 0.2s ease' }}>

      {/* Top nav */}
      <nav className="glass sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)' }}>
              ⚽
            </div>
            <span className="font-bold text-[15px] tracking-tight" style={{ color: 'var(--c-t1)' }}>
              JNVN98: FIFA Arena
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle size={34} />
            {user ? (
              <Link to="/"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
                style={{ background: 'var(--c-primary)', color: '#fff' }}>
                My Dashboard
              </Link>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
                style={{ background: 'var(--c-primary)', color: '#fff' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <GoogleIcon size={14} />
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="py-10 px-4 text-center" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight mb-2" style={{ color: 'var(--c-t1)' }}>
          Discover Groups &{' '}
          <span style={{ background: 'linear-gradient(90deg, #5B6CF8, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Active Polls
          </span>
        </h1>
        <p className="text-[14px]" style={{ color: 'var(--c-t3)' }}>
          Join a public group and start predicting — no invite needed.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl h-48 animate-pulse" style={{ background: 'var(--c-surface)' }} />
            ))}
          </div>
        ) : (
          <>
            {/* Groups section */}
            <section>
              <h2 className="text-[18px] font-bold mb-4" style={{ color: 'var(--c-t1)' }}>
                Public Groups
              </h2>
              {groups.length === 0 ? (
                <div className="rounded-2xl py-12 flex flex-col items-center gap-2"
                  style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
                  <span className="text-4xl">👥</span>
                  <p className="text-[13px]" style={{ color: 'var(--c-t3)' }}>No public groups yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((g) => (
                    <GroupCard
                      key={g.id}
                      group={g}
                      activePollCount={polls.filter((p) => p.groupId === g.id).length}
                      isMember={myGroupIds.has(g.id)}
                      user={user}
                      onJoin={handleJoin}
                      joining={joining}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Polls section */}
            {polls.length > 0 && (
              <section>
                <h2 className="text-[18px] font-bold mb-4" style={{ color: 'var(--c-t1)' }}>
                  Active Polls
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {polls.map((p) => (
                    <PollCard
                      key={p.id}
                      poll={p}
                      groupName={groupNameMap[p.groupId] || p.groupId}
                      isMember={myGroupIds.has(p.groupId)}
                      user={user}
                      onJoin={handleJoin}
                      joining={joining}
                    />
                  ))}
                </div>
              </section>
            )}

            {groups.length > 0 && polls.length === 0 && (
              <div className="rounded-2xl py-10 flex flex-col items-center gap-2"
                style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
                <span className="text-3xl">📊</span>
                <p className="text-[13px]" style={{ color: 'var(--c-t3)' }}>No active polls right now — check back soon</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
