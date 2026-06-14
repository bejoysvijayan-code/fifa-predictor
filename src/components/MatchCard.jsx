import { useState } from 'react';
import { formatKickoff, getPredictionStatus, isMatchLocked } from '../utils/scoring';
import PredictionButtonGroup from './PredictionButtonGroup';
import CircleFlag from './CircleFlag';
import { savePrediction } from '../firebase/services';
import { useAuth } from '../contexts/AuthContext';

const STATUS_BADGE = {
  upcoming: <span className="badge-upcoming">Upcoming</span>,
  live: <span className="badge-live"><span>●</span> Live</span>,
  completed: <span className="badge-completed">Done</span>,
};

export default function MatchCard({ match, userPrediction, onPredictionSaved }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [localPrediction, setLocalPrediction] = useState(userPrediction?.prediction || null);

  const locked = isMatchLocked(match.kickoffTime);
  const predStatus = match.status === 'completed'
    ? getPredictionStatus(localPrediction, match)
    : 'pending';

  async function handleSelect(value) {
    if (locked || saving) return;
    setSaving(true);
    try {
      await savePrediction(user.uid, match.id, value);
      setLocalPrediction(value);
      onPredictionSaved?.();
    } finally {
      setSaving(false);
    }
  }

  const predStyle =
    predStatus === 'correct'
      ? { background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }
      : predStatus === 'incorrect'
      ? { background: 'var(--c-red-bg)', border: '1px solid var(--c-red-bd)', color: 'var(--c-red)' }
      : { background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' };

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200"
      style={{
        background: 'var(--c-card)',
        border: '1px solid var(--c-border)',
        boxShadow: 'var(--c-shadow)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {STATUS_BADGE[match.status]}
          {match.matchNumber != null && (
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-gold)' }}>
              #{match.matchNumber}
            </span>
          )}
        </div>
        <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>
          {formatKickoff(match.kickoffTime)}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-center flex flex-col items-center">
          <CircleFlag team={match.homeTeam} size={52} className="mb-2" />
          <div className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--c-t1)' }}>
            {match.homeTeam}
          </div>
        </div>

        <div className="flex-shrink-0 text-center px-1 min-w-[64px]">
          {match.status === 'completed' && match.result ? (
            <>
              {match.result.homeScore != null && match.result.awayScore != null ? (
                <div className="text-[22px] font-black leading-none mb-1" style={{ color: 'var(--c-t1)' }}>
                  {match.result.homeScore}–{match.result.awayScore}
                </div>
              ) : (
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--c-t3)' }}>
                  FT
                </div>
              )}
              <div className="text-[11px] font-bold" style={{ color: 'var(--c-gold)' }}>
                {match.result.winner === 'Draw' ? '🤝 Draw' : match.result.winner}
              </div>
            </>
          ) : (
            <div className="text-[14px] font-bold" style={{ color: 'var(--c-t3)' }}>VS</div>
          )}
        </div>

        <div className="flex-1 text-center flex flex-col items-center">
          <CircleFlag team={match.awayTeam} size={52} className="mb-2" />
          <div className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--c-t1)' }}>
            {match.awayTeam}
          </div>
        </div>
      </div>

      {/* Prediction */}
      {user && (
        <div className="mt-4">
          {match.status === 'completed' && localPrediction ? (
            <div
              className="flex items-center justify-between text-[12px] font-semibold px-4 py-3 rounded-xl"
              style={predStyle}
            >
              <span>Your pick: <strong>{localPrediction}</strong></span>
              <span>
                {predStatus === 'correct' ? '✓ +3 pts' : predStatus === 'incorrect' ? '✗ 0 pts' : '⏳ Pending'}
              </span>
            </div>
          ) : match.status === 'completed' && !localPrediction ? (
            <div className="text-center text-[11px] py-2" style={{ color: 'var(--c-t3)' }}>
              No prediction made
            </div>
          ) : (
            <>
              <PredictionButtonGroup
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                selected={localPrediction}
                locked={locked}
                onSelect={handleSelect}
              />
              {locked && !localPrediction && (
                <p className="text-[11px] text-center mt-2" style={{ color: 'var(--c-t3)' }}>
                  🔒 Predictions locked — match has started
                </p>
              )}
              {saving && (
                <p className="text-[11px] text-center mt-2" style={{ color: 'var(--c-primary)' }}>Saving…</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
