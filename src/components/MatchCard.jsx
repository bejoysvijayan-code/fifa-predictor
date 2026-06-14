import { useState } from 'react';
import { formatKickoff, getFlag, getPredictionStatus, isMatchLocked } from '../utils/scoring';
import PredictionButtonGroup from './PredictionButtonGroup';
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

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200"
      style={{
        background: '#0D0D1A',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {STATUS_BADGE[match.status]}
          {match.matchNumber != null && (
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(240,180,41,0.65)' }}>
              #{match.matchNumber}
            </span>
          )}
        </div>
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {formatKickoff(match.kickoffTime)}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-center">
          <div className="text-4xl mb-2">{getFlag(match.homeTeam)}</div>
          <div className="text-[13px] font-semibold leading-tight" style={{ color: '#E8EAFF' }}>
            {match.homeTeam}
          </div>
        </div>

        <div className="flex-shrink-0 text-center px-1 min-w-[64px]">
          {match.status === 'completed' && match.result ? (
            <>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Winner
              </div>
              <div className="text-[13px] font-bold" style={{ color: '#F0B429' }}>
                {match.result.winner === 'Draw' ? '🤝 Draw' : match.result.winner}
              </div>
            </>
          ) : (
            <div className="text-[14px] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>VS</div>
          )}
        </div>

        <div className="flex-1 text-center">
          <div className="text-4xl mb-2">{getFlag(match.awayTeam)}</div>
          <div className="text-[13px] font-semibold leading-tight" style={{ color: '#E8EAFF' }}>
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
              style={
                predStatus === 'correct'
                  ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ADE80' }
                  : predStatus === 'incorrect'
                  ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FF7676' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.38)' }
              }
            >
              <span>Your pick: <strong>{localPrediction}</strong></span>
              <span>
                {predStatus === 'correct' ? '✓ +3 pts' : predStatus === 'incorrect' ? '✗ 0 pts' : '⏳ Pending'}
              </span>
            </div>
          ) : match.status === 'completed' && !localPrediction ? (
            <div className="text-center text-[11px] py-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
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
                <p className="text-[11px] text-center mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  🔒 Predictions locked — match has started
                </p>
              )}
              {saving && (
                <p className="text-[11px] text-center mt-2" style={{ color: '#8B9CFF' }}>Saving…</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
