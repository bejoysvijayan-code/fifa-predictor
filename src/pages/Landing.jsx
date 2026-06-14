import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPublicData } from '../firebase/services';
import { sortLeaderboard } from '../utils/scoring';
import { getCountryCode } from '../utils/countryFlags';
import PublicMatchCard from '../components/PublicMatchCard';
import CircleFlag from '../components/CircleFlag';
import ThemeToggle from '../components/ThemeToggle';

const CDN = 'https://hatscripts.github.io/circle-flags/flags';

/* ── Google Icon ──────────────────────────────────────── */
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/* ── Animated counter ─────────────────────────────────── */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!value) return;
    const start = Date.now();
    const duration = 1200;
    const step = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(ease * value));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

/* ── Landing Nav ──────────────────────────────────────── */
function LandingNav({ onSignIn }) {
  return (
    <nav className="glass sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)' }}
          >
            ⚽
          </div>
          <span className="font-bold text-[15px] tracking-tight" style={{ color: 'var(--c-t1)' }}>
            JNVN98: FIFA Arena
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle size={34} />
          <button
            onClick={onSignIn}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{
              background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)',
              color: '#fff',
              boxShadow: '0 2px 12px rgba(91,108,248,0.35)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <GoogleIcon size={15} />
            <span className="hidden sm:inline">Sign in with Google</span>
            <span className="sm:hidden">Sign in</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero Section ─────────────────────────────────────── */
function HeroSection({ liveCount, totalUsers, onSignIn }) {
  return (
    <section
      style={{
        background: 'linear-gradient(160deg, #07070F 0%, #0c0c24 45%, #0a0218 75%, #07070F 100%)',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 72,
        paddingBottom: 80,
      }}
    >
      {/* Decorative orbs */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(91,108,248,0.12) 0%, transparent 70%)',
        top: -200, left: -100, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
        bottom: -150, right: -80, pointerEvents: 'none',
      }} />

      {/* Floating circle flags */}
      {[
        { team: 'Brazil',   code: 'br' },
        { team: 'Argentina',code: 'ar' },
        { team: 'France',   code: 'fr' },
        { team: 'Germany',  code: 'de' },
        { team: 'Spain',    code: 'es' },
        { team: 'England',  code: 'gb-eng' },
        { team: 'Portugal', code: 'pt' },
        { team: 'USA',      code: 'us' },
      ].map(({ team, code }, i) => {
        const size = 36 + (i % 3) * 12;
        return (
          <img
            key={i}
            src={`${CDN}/${code}.svg`}
            width={size}
            height={size}
            alt={team}
            draggable={false}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              opacity: 0.08 + (i % 4) * 0.025,
              top: `${10 + (i * 11) % 70}%`,
              left:  i % 2 === 0 ? `${5 + (i * 7) % 20}%` : undefined,
              right: i % 2 !== 0 ? `${5 + (i * 9) % 20}%` : undefined,
              pointerEvents: 'none',
              userSelect: 'none',
              animation: `float ${4 + i * 0.7}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        );
      })}

      <div className="max-w-3xl mx-auto px-4 text-center relative">
        {/* Live badge */}
        {liveCount > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <span
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(255,118,118,0.15)', border: '1px solid rgba(255,118,118,0.35)', color: '#FF7676' }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#FF7676', display: 'inline-block',
                animation: 'pulse 1.2s infinite',
              }} />
              {liveCount} Match{liveCount > 1 ? 'es' : ''} Live Now
            </span>
          </div>
        )}

        {/* Headline */}
        <h1
          className="font-black leading-tight mb-4"
          style={{
            fontSize: 'clamp(32px, 6vw, 60px)',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #B8C1FF 50%, #E8D5FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.03em',
          }}
        >
          Predict Every Match.
          <br />
          Climb the Leaderboard.
        </h1>

        {/* Subheadline */}
        <p
          className="mb-8 max-w-xl mx-auto leading-relaxed"
          style={{ fontSize: 'clamp(15px, 2.5vw, 18px)', color: 'rgba(180,190,230,0.8)' }}
        >
          Follow the FIFA World Cup, predict match winners, track results, and compete with fans worldwide.
        </p>

        {/* CTA Button */}
        <button
          onClick={onSignIn}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #5B6CF8 0%, #8B5CF6 100%)',
            color: '#fff',
            boxShadow: '0 4px 30px rgba(91,108,248,0.5)',
            fontSize: 16,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(91,108,248,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 30px rgba(91,108,248,0.5)';
          }}
        >
          <GoogleIcon size={20} />
          Sign in with Google to Start Predicting
        </button>

        {totalUsers > 0 && (
          <p className="mt-4 text-sm" style={{ color: 'rgba(150,165,200,0.7)' }}>
            Join {totalUsers.toLocaleString()}+ fans already predicting
          </p>
        )}
      </div>
    </section>
  );
}

/* ── Stats Bar ────────────────────────────────────────── */
function StatsBar({ totalUsers, totalPredictions, activeMatches }) {
  const stats = [
    { label: 'Predictors',  value: totalUsers,       icon: '👥' },
    { label: 'Predictions', value: totalPredictions, icon: '🎯' },
    { label: 'Active Matches', value: activeMatches, icon: '⚽' },
  ];

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        borderTop: '1px solid var(--c-border)',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-5 grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="flex flex-col items-center text-center">
            <div
              className="font-black tabular-nums"
              style={{ fontSize: 'clamp(20px, 4vw, 32px)', color: 'var(--c-t1)', lineHeight: 1.1 }}
            >
              <AnimatedNumber value={value} />
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--c-t2)' }}>
              {icon} {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Section header ───────────────────────────────────── */
function SectionHeader({ title, subtitle, accent = false }) {
  return (
    <div className="mb-6">
      <h2
        className="text-xl font-black tracking-tight flex items-center gap-2"
        style={{ color: 'var(--c-t1)' }}
      >
        {accent && (
          <span
            style={{
              width: 4, height: 22, borderRadius: 2,
              background: 'linear-gradient(180deg, #5B6CF8, #8B5CF6)',
              display: 'inline-block', flexShrink: 0,
            }}
          />
        )}
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: 'var(--c-t2)' }}>{subtitle}</p>
      )}
    </div>
  );
}

/* ── Match Browser ────────────────────────────────────── */
const FILTER_TABS = [
  { key: 'all',       label: 'All' },
  { key: 'live',      label: '🔴 Live' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

function MatchBrowser({ matches, predCounts, onSignIn }) {
  const [activeTab, setActiveTab] = useState('all');

  const counts = {
    all: matches.length,
    live: matches.filter((m) => m.status === 'live').length,
    upcoming: matches.filter((m) => m.status === 'upcoming').length,
    completed: matches.filter((m) => m.status === 'completed').length,
  };

  // Sort: live first, then upcoming, then completed — within each group by matchNumber
  const sorted = [...matches].sort((a, b) => {
    const order = { live: 0, upcoming: 1, completed: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return (a.matchNumber ?? Infinity) - (b.matchNumber ?? Infinity);
  });

  const filtered = activeTab === 'all' ? sorted : sorted.filter((m) => m.status === activeTab);

  // Determine featured match (first live, or first upcoming)
  const featuredId = sorted.find((m) => m.status === 'live')?.id
    || sorted.find((m) => m.status === 'upcoming')?.id;

  if (matches.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <SectionHeader
        title="Match Centre"
        subtitle="Live scores, upcoming fixtures, and final results"
        accent
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_TABS.map(({ key, label }) => {
          const count = counts[key];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1.5"
              style={
                isActive
                  ? { background: 'var(--c-primary)', color: '#fff', boxShadow: '0 2px 10px rgba(91,108,248,0.3)' }
                  : { background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }
              }
            >
              {label}
              {count > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--c-surface2)',
                    color: isActive ? '#fff' : 'var(--c-t3)',
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Match grid */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: 'var(--c-surface)', border: '1px dashed var(--c-border-s)' }}
        >
          <div className="text-4xl mb-3">⚽</div>
          <p className="font-semibold" style={{ color: 'var(--c-t2)' }}>No {activeTab} matches</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((match) => (
            <PublicMatchCard
              key={match.id}
              match={match}
              predCounts={predCounts[match.id] || {}}
              onSignIn={onSignIn}
              featured={match.id === featuredId && activeTab === 'all'}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Leaderboard Preview ──────────────────────────────── */
const RANK_STYLE = {
  1: { bg: 'var(--c-gold-bg)', bd: 'var(--c-gold-bd)', color: 'var(--c-gold)', medal: '🥇' },
  2: { bg: 'rgba(148,163,184,0.10)', bd: 'rgba(148,163,184,0.22)', color: '#94A3B8', medal: '🥈' },
  3: { bg: 'rgba(205,127,50,0.10)', bd: 'rgba(205,127,50,0.22)', color: '#CD7F32', medal: '🥉' },
};

function LeaderboardPreview({ users, onSignIn }) {
  const sorted = sortLeaderboard(users).slice(0, 10);

  if (sorted.length === 0) return null;

  return (
    <section
      style={{
        background: 'var(--c-surface)',
        borderTop: '1px solid var(--c-border)',
        borderBottom: '1px solid var(--c-border)',
        padding: '48px 0',
      }}
    >
      <div className="max-w-2xl mx-auto px-4">
        <SectionHeader
          title="🏆 Top Predictors"
          subtitle="The best fans worldwide, ranked by accuracy"
        />

        <div className="space-y-2">
          {sorted.map((u, idx) => {
            const rank = idx + 1;
            const rs = RANK_STYLE[rank];
            return (
              <div
                key={u.uid || u.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: rs ? rs.bg : 'var(--c-card)',
                  border: `1px solid ${rs ? rs.bd : 'var(--c-border)'}`,
                  transition: 'transform 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateX(4px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateX(0)')}
              >
                {/* Rank */}
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-full font-black text-sm flex-shrink-0"
                  style={rs ? { color: rs.color } : { color: 'var(--c-t3)' }}
                >
                  {rs ? rs.medal : `#${rank}`}
                </div>

                {/* Avatar */}
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.displayName} className="w-9 h-9 rounded-full flex-shrink-0" />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)', color: '#fff' }}
                  >
                    {u.displayName?.[0] || '?'}
                  </div>
                )}

                {/* Name & stats */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: 'var(--c-t1)' }}>
                    {u.displayName}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--c-t3)' }}>
                    {u.correctPredictions ?? 0} correct · {(u.accuracyPercentage ?? 0).toFixed(1)}% accuracy
                  </div>
                </div>

                {/* Points */}
                <div
                  className="font-black text-lg flex-shrink-0"
                  style={{ color: rs ? rs.color : 'var(--c-t1)' }}
                >
                  {u.totalPoints ?? 0}
                  <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--c-t3)' }}>pts</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onSignIn}
          className="mt-6 w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150"
          style={{
            background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)',
            color: '#fff',
            boxShadow: '0 2px 16px rgba(91,108,248,0.3)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <GoogleIcon size={16} />
          Sign in to Join the Leaderboard
        </button>
      </div>
    </section>
  );
}

/* ── Bottom CTA ───────────────────────────────────────── */
function BottomCTA({ onSignIn }) {
  return (
    <section
      style={{
        background: 'linear-gradient(160deg, #07070F 0%, #0c0c24 50%, #07070F 100%)',
        padding: '72px 16px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(91,108,248,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="max-w-xl mx-auto relative">
        <div className="text-5xl mb-4">🏆</div>
        <h2
          className="font-black mb-3"
          style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            background: 'linear-gradient(135deg, #FFFFFF, #B8C1FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
          }}
        >
          Ready to compete?
        </h2>
        <p className="mb-8" style={{ color: 'rgba(180,190,230,0.75)', fontSize: 16 }}>
          Sign in with Google to take part in the predictions and climb the global leaderboard.
        </p>
        <button
          onClick={onSignIn}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)',
            color: '#fff',
            boxShadow: '0 4px 30px rgba(91,108,248,0.5)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(91,108,248,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 30px rgba(91,108,248,0.5)';
          }}
        >
          <GoogleIcon size={20} />
          Sign in with Google to Start Predicting
        </button>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────── */
function LandingFooter() {
  return (
    <footer
      className="text-center py-6 text-xs"
      style={{ color: 'var(--c-t3)', background: 'var(--c-page)', borderTop: '1px solid var(--c-border)' }}
    >
      JNVN98: FIFA Arena · Fan-made prediction platform · Not affiliated with FIFA
    </footer>
  );
}

/* ── Loading Skeleton ─────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page)' }}>
      <div style={{ height: 56, background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)' }} />
      <div
        style={{
          background: 'linear-gradient(160deg, #07070F, #0c0c24, #07070F)',
          height: 340,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    </div>
  );
}

/* ── Main Landing Page ────────────────────────────────── */
export default function Landing() {
  const { loginWithGoogle } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    getPublicData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function handleSignIn() {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await loginWithGoogle();
    } finally {
      setSigningIn(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  const { matches, predCounts, totalUsers, totalPredictions, activeMatches, leaderboard } = data;
  const liveCount = matches.filter((m) => m.status === 'live').length;

  return (
    <div style={{ background: 'var(--c-page)', minHeight: '100vh' }}>
      <LandingNav onSignIn={handleSignIn} />

      <HeroSection
        liveCount={liveCount}
        totalUsers={totalUsers}
        onSignIn={handleSignIn}
      />

      <StatsBar
        totalUsers={totalUsers}
        totalPredictions={totalPredictions}
        activeMatches={activeMatches}
      />

      <MatchBrowser
        matches={matches}
        predCounts={predCounts}
        onSignIn={handleSignIn}
      />

      <LeaderboardPreview
        users={leaderboard}
        onSignIn={handleSignIn}
      />

      <BottomCTA onSignIn={handleSignIn} />

      <LandingFooter />
    </div>
  );
}
