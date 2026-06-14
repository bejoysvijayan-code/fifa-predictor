import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPublicMatches } from '../firebase/services';
import CircleFlag from '../components/CircleFlag';
import ThemeToggle from '../components/ThemeToggle';
import { formatKickoff } from '../utils/scoring';

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

function StatusBadge({ status }) {
  if (status === 'live') return <span className="badge-live"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-red)', display: 'inline-block' }} /> LIVE</span>;
  if (status === 'completed') return <span className="badge-completed">FT</span>;
  return <span className="badge-upcoming">Upcoming</span>;
}

function MatchBox({ match, predCounts = {}, onSignIn }) {
  const { homeTeam, awayTeam, kickoffTime, group, status, result, matchNumber } = match;

  const homeCount = predCounts[homeTeam] || 0;
  const drawCount = predCounts['Draw'] || 0;
  const awayCount = predCounts[awayTeam] || 0;
  const total = homeCount + drawCount + awayCount;
  const homePct = total > 0 ? Math.round((homeCount / total) * 100) : 0;
  const drawPct = total > 0 ? Math.round((drawCount / total) * 100) : 0;
  const awayPct = total > 0 ? 100 - homePct - drawPct : 0;

  const hasScore = result?.homeScore != null && result?.awayScore != null;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: 'var(--c-card)',
        border: '1px solid var(--c-border)',
        boxShadow: 'var(--c-shadow)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <StatusBadge status={status} />
        <div className="flex items-center gap-2">
          {group && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--c-gold-bg)', border: '1px solid var(--c-gold-bd)', color: 'var(--c-gold)' }}>
              Group {group}
            </span>
          )}
          {matchNumber != null && (
            <span className="text-[10px] font-semibold" style={{ color: 'var(--c-t3)' }}>#{matchNumber}</span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
          <CircleFlag team={homeTeam} size={44} />
          <span className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--c-t1)' }}>{homeTeam}</span>
        </div>

        <div className="flex-shrink-0 text-center" style={{ minWidth: 60 }}>
          {status === 'completed' ? (
            <>
              <div className="font-black text-[20px] leading-none" style={{ color: 'var(--c-t1)', letterSpacing: '-0.02em' }}>
                {hasScore ? `${result.homeScore}–${result.awayScore}` : 'FT'}
              </div>
              {result?.winner && (
                <div className="text-[10px] font-bold mt-1" style={{ color: 'var(--c-gold)' }}>
                  {result.winner === 'Draw' ? '🤝 Draw' : `${result.winner === homeTeam ? homeTeam : awayTeam} Win`}
                </div>
              )}
            </>
          ) : status === 'live' ? (
            <div className="font-black text-[18px]" style={{ color: 'var(--c-red)' }}>• • •</div>
          ) : (
            <div className="text-[11px] font-medium" style={{ color: 'var(--c-t3)' }}>
              {formatKickoff(kickoffTime)}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
          <CircleFlag team={awayTeam} size={44} />
          <span className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--c-t1)' }}>{awayTeam}</span>
        </div>
      </div>

      {/* Crowd bars */}
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span style={{ color: 'var(--c-t3)' }}>Crowd Picks</span>
            <span style={{ color: 'var(--c-t3)' }}>{total.toLocaleString()} votes</span>
          </div>
          <div className="flex rounded-full overflow-hidden mb-1" style={{ height: 5, background: 'var(--c-border)' }}>
            <div style={{ width: `${homePct}%`, background: 'var(--c-primary)', transition: 'width 0.6s ease' }} />
            <div style={{ width: `${drawPct}%`, background: 'var(--c-t3)', transition: 'width 0.6s ease 0.05s' }} />
            <div style={{ width: `${awayPct}%`, background: 'var(--c-orange)', transition: 'width 0.6s ease 0.1s' }} />
          </div>
          <div className="flex justify-between text-[10px] font-semibold">
            <span style={{ color: 'var(--c-primary)' }}>{homePct}%</span>
            <span style={{ color: 'var(--c-t3)' }}>🤝 {drawPct}%</span>
            <span style={{ color: 'var(--c-orange)' }}>{awayPct}%</span>
          </div>
        </div>
      )}

      {/* Sign-in CTA */}
      <button
        onClick={onSignIn}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150"
        style={{
          background: 'var(--c-primary-bg)',
          border: '1px solid var(--c-primary-bd)',
          color: 'var(--c-primary)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--c-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-primary-bg)'; e.currentTarget.style.color = 'var(--c-primary)'; e.currentTarget.style.borderColor = 'var(--c-primary-bd)'; }}
      >
        <GoogleIcon size={14} />
        Sign in to Predict
      </button>
    </div>
  );
}

const FILTERS = ['All', 'Live', 'Upcoming', 'Completed'];

export default function Login() {
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    getPublicMatches()
      .then((d) => setData(d))
      .catch((err) => { console.error('getPublicMatches failed:', err); setData({ matches: [], predCounts: {} }); })
      .finally(() => setLoading(false));
  }, []);

  const matches = data?.matches || [];
  const predCounts = data?.predCounts || {};

  const filtered = activeTab === 'All'
    ? matches
    : matches.filter((m) => m.status === activeTab.toLowerCase());

  const tabCounts = {
    All: matches.length,
    Live: matches.filter((m) => m.status === 'live').length,
    Upcoming: matches.filter((m) => m.status === 'upcoming').length,
    Completed: matches.filter((m) => m.status === 'completed').length,
  };

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
            <button
              onClick={loginWithGoogle}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
              style={{ background: 'var(--c-primary)', color: '#fff' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <GoogleIcon size={14} />
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero banner */}
      <div className="py-10 px-4 text-center" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight mb-2" style={{ color: 'var(--c-t1)' }}>
          Predict Every Match.{' '}
          <span style={{ background: 'linear-gradient(90deg, #5B6CF8, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Climb the Leaderboard.
          </span>
        </h1>
        <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--c-gold)' }}>
          🏆 Win Exciting Prizes!
        </p>
        <p className="text-[14px] mb-6" style={{ color: 'var(--c-t3)' }}>
          Browse all FIFA World Cup 2026 matches below — sign in to submit your predictions.
        </p>
        <button
          onClick={loginWithGoogle}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[14px] font-bold transition-all duration-150"
          style={{
            background: '#ffffff',
            color: '#111827',
            border: '1px solid rgba(0,0,0,0.10)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)')}
        >
          <GoogleIcon size={18} />
          Sign in with Google to Start Predicting
        </button>
      </div>

      {/* Match grid */}
      <div className="max-w-5xl mx-auto px-4 py-7">

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-150"
                style={
                  active
                    ? { background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }
                    : { background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }
                }
              >
                {tab === 'Live' && '🔴 '}{tab}
                {tabCounts[tab] > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: active ? 'var(--c-primary-bd)' : 'var(--c-border)',
                      color: active ? 'var(--c-primary)' : 'var(--c-t3)',
                    }}>
                    {tabCounts[tab]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl h-56 animate-pulse" style={{ background: 'var(--c-surface)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl py-16 flex flex-col items-center gap-3"
            style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <span className="text-4xl">🏟️</span>
            <p className="text-[13px]" style={{ color: 'var(--c-t3)' }}>No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} matches</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m) => (
              <MatchBox key={m.id} match={m} predCounts={predCounts[m.id] || {}} onSignIn={loginWithGoogle} />
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="py-10 px-4 text-center" style={{ borderTop: '1px solid var(--c-border)' }}>
        <p className="text-[13px] mb-4" style={{ color: 'var(--c-t3)' }}>
          Join your 80 Navodayan batchmates in predicting FIFA World Cup 2026 results
        </p>
        <button
          onClick={loginWithGoogle}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
          style={{ background: 'var(--c-primary)', color: '#fff' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <GoogleIcon size={14} />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
