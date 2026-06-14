import { useEffect, useState } from 'react';
import { getFlag, formatKickoff } from '../utils/scoring';
import CircleFlag from './CircleFlag';
import CountdownTimer from './CountdownTimer';

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
  if (status === 'live') {
    return (
      <span
        className="badge-live"
        style={{ animation: 'pulse 2s infinite' }}
      >
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--c-red)', display: 'inline-block',
            animation: 'pulse 1.2s infinite',
          }}
        />
        LIVE
      </span>
    );
  }
  if (status === 'completed') {
    return <span className="badge-completed">FT</span>;
  }
  return <span className="badge-upcoming">Upcoming</span>;
}

export default function PublicMatchCard({ match, predCounts = {}, onSignIn, featured = false }) {
  const [barsMounted, setBarsMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setBarsMounted(true), 80); return () => clearTimeout(t); }, []);

  const { homeTeam, awayTeam, kickoffTime, group, venue, status, result, matchNumber } = match;

  // Crowd prediction percentages
  const homeCount = predCounts[homeTeam] || 0;
  const drawCount = predCounts['Draw'] || 0;
  const awayCount = predCounts[awayTeam] || 0;
  const total = homeCount + drawCount + awayCount;
  const homePct = total > 0 ? Math.round((homeCount / total) * 100) : 0;
  const drawPct = total > 0 ? Math.round((drawCount / total) * 100) : 0;
  const awayPct = total > 0 ? 100 - homePct - drawPct : 0;

  const hasScore = result?.homeScore != null && result?.awayScore != null;
  const isLive = status === 'live';
  const isCompleted = status === 'completed';
  const isUpcoming = status === 'upcoming';

  const kickoffDate = kickoffTime
    ? (kickoffTime.toDate ? kickoffTime.toDate() : new Date(kickoffTime))
    : null;
  const kickoffPast = kickoffDate ? kickoffDate < new Date() : false;
  const showCountdown = isUpcoming && !kickoffPast && kickoffTime;

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...(featured ? { borderColor: 'var(--c-gold-bd)', boxShadow: '0 0 0 1px var(--c-gold-bd), var(--c-shadow)' } : {}),
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Live top stripe */}
      {isLive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--c-red) 40%, var(--c-red) 60%, transparent)',
        }} />
      )}

      {/* Featured top stripe */}
      {featured && !isLive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--c-gold) 40%, var(--c-gold) 60%, transparent)',
        }} />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-4" style={{ gap: 8 }}>
        <StatusBadge status={status} />

        <div className="flex items-center gap-2 min-w-0">
          {group && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--c-gold-bg)', border: '1px solid var(--c-gold-bd)', color: 'var(--c-gold)' }}
            >
              Group {group}
            </span>
          )}
          {venue && (
            <span className="text-xs truncate hidden sm:block" style={{ color: 'var(--c-t3)' }}>
              📍 {venue}
            </span>
          )}
        </div>

        {matchNumber != null && (
          <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--c-t3)' }}>
            #{matchNumber}
          </span>
        )}
      </div>

      {/* Teams + Score */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* Home team */}
        <div className="flex-1 flex flex-col items-center text-center gap-1.5">
          <CircleFlag team={homeTeam} size={52} />
          <span className="text-sm font-bold leading-tight" style={{ color: 'var(--c-t1)' }}>
            {homeTeam}
          </span>
        </div>

        {/* Centre: score / vs */}
        <div className="flex-shrink-0 text-center" style={{ minWidth: 72 }}>
          {isCompleted ? (
            <div>
              <div
                className="font-black"
                style={{
                  fontSize: hasScore ? 26 : 14,
                  color: 'var(--c-t1)',
                  letterSpacing: '-0.02em',
                }}
              >
                {hasScore ? `${result.homeScore} – ${result.awayScore}` : 'FT'}
              </div>
              {result?.winner && (
                <div
                  className="text-xs font-bold mt-1 px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--c-gold-bg)',
                    border: '1px solid var(--c-gold-bd)',
                    color: 'var(--c-gold)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {result.winner === 'Draw'
                    ? '🤝 Draw'
                    : result.winner === homeTeam
                    ? `${getFlag(homeTeam)} Win`
                    : `${getFlag(awayTeam)} Win`}
                </div>
              )}
            </div>
          ) : isLive ? (
            <div>
              <div
                className="font-black"
                style={{ fontSize: hasScore ? 26 : 18, color: 'var(--c-red)', letterSpacing: '-0.02em' }}
              >
                {hasScore ? `${result.homeScore} – ${result.awayScore}` : '• • •'}
              </div>
              <div className="text-xs font-bold mt-1" style={{ color: 'var(--c-red)', opacity: 0.7 }}>LIVE</div>
            </div>
          ) : (
            <span className="text-xl font-bold" style={{ color: 'var(--c-t3)' }}>vs</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center text-center gap-1.5">
          <CircleFlag team={awayTeam} size={52} />
          <span className="text-sm font-bold leading-tight" style={{ color: 'var(--c-t1)' }}>
            {awayTeam}
          </span>
        </div>
      </div>

      {/* Kickoff time */}
      <div className="text-center text-xs mb-3" style={{ color: 'var(--c-t2)' }}>
        ⏰ {formatKickoff(kickoffTime)}
        {venue && (
          <span className="sm:hidden"> · {venue}</span>
        )}
      </div>

      {/* Countdown */}
      {showCountdown && (
        <div className="flex justify-center mb-4">
          <CountdownTimer kickoffTime={kickoffTime} />
        </div>
      )}

      {/* Crowd prediction bars */}
      {total > 0 ? (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold" style={{ color: 'var(--c-t2)' }}>Crowd Picks</span>
            <span style={{ color: 'var(--c-t3)' }}>
              {total.toLocaleString()} {total === 1 ? 'vote' : 'votes'}
            </span>
          </div>

          {/* Stacked bar */}
          <div
            className="flex rounded-full overflow-hidden mb-2"
            style={{ height: 8, background: 'var(--c-border)' }}
          >
            <div
              style={{
                width: barsMounted ? `${homePct}%` : '0%',
                background: 'var(--c-primary)',
                transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
            <div
              style={{
                width: barsMounted ? `${drawPct}%` : '0%',
                background: 'var(--c-t3)',
                transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1) 0.05s',
              }}
            />
            <div
              style={{
                width: barsMounted ? `${awayPct}%` : '0%',
                background: 'var(--c-orange)',
                transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1) 0.1s',
              }}
            />
          </div>

          {/* Percentage labels */}
          <div className="flex justify-between text-xs font-semibold items-center">
            <span className="flex items-center gap-1" style={{ color: 'var(--c-primary)' }}>
              <CircleFlag team={homeTeam} size={16} /> {homePct}%
            </span>
            <span style={{ color: 'var(--c-t3)' }}>🤝 {drawPct}%</span>
            <span className="flex items-center gap-1" style={{ color: 'var(--c-orange)' }}>
              {awayPct}% <CircleFlag team={awayTeam} size={16} />
            </span>
          </div>
        </div>
      ) : (
        !isCompleted && (
          <div
            className="text-xs text-center mb-4 py-2 rounded-xl"
            style={{
              background: 'var(--c-surface)',
              border: '1px dashed var(--c-border-s)',
              color: 'var(--c-t3)',
            }}
          >
            No predictions yet — be the first!
          </div>
        )
      )}

      {/* Sign-in CTA */}
      <button
        onClick={onSignIn}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
        style={{
          background: 'var(--c-primary-bg)',
          border: '1px solid var(--c-primary-bd)',
          color: 'var(--c-primary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--c-primary)';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = 'var(--c-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--c-primary-bg)';
          e.currentTarget.style.color = 'var(--c-primary)';
          e.currentTarget.style.borderColor = 'var(--c-primary-bd)';
        }}
      >
        <GoogleIcon size={15} />
        Sign in to Predict
      </button>
    </div>
  );
}
