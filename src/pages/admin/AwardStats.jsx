import { useEffect, useState, useMemo } from 'react';
import { getAllUsers, getAllPredictions, getMatches } from '../../firebase/services';
import { normalizeTeamName } from '../../utils/scoring';

function toDate(val) {
  if (!val) return null;
  return val.toDate ? val.toDate() : new Date(val);
}

function fmtMins(mins) {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${Math.floor(mins % 60)}m avg`;
  return `${mins}m avg`;
}

function AwardSection({ emoji, title, description, children }) {
  return (
    <div className="mb-5 rounded-2xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{emoji}</span>
        <h2 className="font-bold text-[15px]" style={{ color: 'var(--c-t1)' }}>{title}</h2>
      </div>
      {description && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--c-t2)' }}>{description}</p>
      )}
      {children}
    </div>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

function RankList({ rows, showAll }) {
  if (!rows.length) {
    return <p className="text-[13px] py-2" style={{ color: 'var(--c-t2)' }}>No data yet.</p>;
  }
  const visible = showAll ? rows : rows.slice(0, 3);
  return (
    <div>
      {visible.map((row, i) => (
        <div
          key={row.uid || i}
          className="flex items-center justify-between py-[7px]"
          style={{ borderBottom: '1px solid var(--c-border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] w-6 text-center font-medium" style={{ color: 'var(--c-t2)' }}>
              {i < 3 ? MEDALS[i] : i + 1}
            </span>
            <span className="text-[13px]" style={{ color: 'var(--c-t1)' }}>{row.name}</span>
          </div>
          <div className="text-right">
            <span className="text-[13px] font-bold" style={{ color: 'var(--c-gold)' }}>{row.primary}</span>
            {row.secondary && (
              <span className="text-[11px] ml-2" style={{ color: 'var(--c-t2)' }}>{row.secondary}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PerfectRoundList({ achievers, totalMatches, roundLabel }) {
  if (totalMatches === 0) {
    return <p className="text-[13px] py-2" style={{ color: 'var(--c-t2)' }}>{roundLabel} not yet completed.</p>;
  }
  if (!achievers.length) {
    return <p className="text-[13px] py-2" style={{ color: 'var(--c-t2)' }}>No one achieved a perfect {roundLabel} yet.</p>;
  }
  return (
    <div>
      {achievers.map((u) => (
        <div key={u.uid} className="py-2 text-[13px] font-medium flex items-center gap-2" style={{ color: 'var(--c-t1)' }}>
          <span>🎖️</span><span>{u.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function AwardStats() {
  const [users, setUsers] = useState([]);
  const [preds, setPreds] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    Promise.all([getAllUsers(), getAllPredictions(), getMatches()]).then(([u, p, m]) => {
      setUsers(u);
      setPreds(p);
      setMatches(m);
      setLoading(false);
    });
  }, []);

  const awards = useMemo(() => {
    if (!users.length || !matches.length || !preds.length) return null;

    const completedMatches = matches.filter((m) => m.status === 'completed' && m.result?.winner);
    const completedIds = new Set(completedMatches.map((m) => m.id));

    const kickoffMap = {};
    matches.forEach((m) => { kickoffMap[m.id] = toDate(m.kickoffTime); });

    const resultMap = {};
    completedMatches.forEach((m) => { resultMap[m.id] = m.result.winner; });

    const userMap = {};
    users.forEach((u) => { userMap[u.uid || u.id] = u; });

    const predsByUser = {};
    preds.forEach((p) => {
      if (!predsByUser[p.userId]) predsByUser[p.userId] = [];
      predsByUser[p.userId].push(p);
    });

    const predsByMatch = {};
    preds.forEach((p) => {
      if (!predsByMatch[p.matchId]) predsByMatch[p.matchId] = [];
      predsByMatch[p.matchId].push(p);
    });

    const allUids = Object.keys(predsByUser).filter((uid) => userMap[uid] && !userMap[uid].hideFromLeaderboard);

    // Matches recalculate: only predictionTime is used for late check (no fallback)
    function isLate(p) {
      if (!p.predictionTime) return false;
      const kickoff = kickoffMap[p.matchId];
      const pt = toDate(p.predictionTime);
      return !!(kickoff && pt && pt > kickoff);
    }

    function isCorrect(p) {
      const result = resultMap[p.matchId];
      return !!(result && normalizeTeamName(result) === normalizeTeamName(p.prediction));
    }

    // ── Main Leaderboard (from stored user fields) ─────────────
    const mainLB = [...users]
      .filter((u) => !u.hideFromLeaderboard && (u.totalPoints || 0) > 0)
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
      .map((u) => ({
        uid: u.uid || u.id,
        name: u.displayName,
        primary: `${u.totalPoints || 0} pts`,
        secondary: `${u.correctPredictions || 0} correct`,
      }));

    // ── Knockout Leaderboard (live computed, 4 pts) ────────────
    const knockoutCompleted = completedMatches.filter((m) => m.isKnockout);
    const knockoutIds = new Set(knockoutCompleted.map((m) => m.id));
    const knockoutLB = allUids
      .map((uid) => {
        const kp = (predsByUser[uid] || []).filter((p) => knockoutIds.has(p.matchId) && !isLate(p));
        const correct = kp.filter(isCorrect).length;
        return { uid, name: userMap[uid]?.displayName || uid, correct, pts: correct * 4 };
      })
      .filter((s) => s.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .map((s) => ({ ...s, primary: `${s.pts} pts`, secondary: `${s.correct} correct` }));

    // ── Most Active (all predictions, any timing/status) ───────
    const mostActive = allUids
      .map((uid) => ({
        uid, name: userMap[uid]?.displayName || uid,
        value: predsByUser[uid].length,
        primary: `${predsByUser[uid].length}`,
        secondary: 'predictions',
      }))
      .sort((a, b) => b.value - a.value);

    // ── Top Accurate (min 20 on-time predictions) ──────────────
    const topAccurate = allUids
      .map((uid) => {
        const onTime = predsByUser[uid].filter((p) => completedIds.has(p.matchId) && !isLate(p));
        if (onTime.length < 20) return null;
        const correct = onTime.filter(isCorrect).length;
        const pct = Math.round((correct / onTime.length) * 1000) / 10;
        return { uid, name: userMap[uid]?.displayName || uid, pct,
          primary: `${pct}%`, secondary: `${correct}/${onTime.length}` };
      })
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct);

    // ── Early Bird (avg mins before kickoff, predictionTime only, min 5) ──
    const earlyBird = allUids
      .map((uid) => {
        const timed = predsByUser[uid].filter((p) => {
          const kickoff = kickoffMap[p.matchId];
          const pt = toDate(p.predictionTime);
          return kickoff && pt && pt < kickoff;
        });
        if (timed.length < 5) return null;
        const avgMins = timed.reduce((s, p) => {
          const kickoff = kickoffMap[p.matchId];
          const pt = toDate(p.predictionTime);
          return s + (kickoff - pt) / 60000;
        }, 0) / timed.length;
        const mins = Math.round(avgMins);
        return { uid, name: userMap[uid]?.displayName || uid, mins,
          primary: fmtMins(mins), secondary: `${timed.length} predictions` };
      })
      .filter(Boolean)
      .sort((a, b) => b.mins - a.mins);

    // ── Contrarian + Upset Specialist ─────────────────────────
    const minStats = {};
    completedMatches.forEach((m) => {
      const mp = (predsByMatch[m.id] || []).filter((p) => !isLate(p));
      if (mp.length < 2) return;
      const vc = {};
      mp.forEach((p) => {
        const t = normalizeTeamName(p.prediction);
        vc[t] = (vc[t] || 0) + 1;
      });
      if (Object.keys(vc).length < 2) return;
      const maxV = Math.max(...Object.values(vc));
      mp.forEach((p) => {
        const t = normalizeTeamName(p.prediction);
        if (vc[t] < maxV) {
          if (!minStats[p.userId]) minStats[p.userId] = { attempts: 0, correct: 0 };
          minStats[p.userId].attempts++;
          if (isCorrect(p)) minStats[p.userId].correct++;
        }
      });
    });

    const contrarian = Object.entries(minStats)
      .filter(([uid, s]) => s.attempts >= 3 && userMap[uid])
      .map(([uid, s]) => {
        const pct = Math.round((s.correct / s.attempts) * 1000) / 10;
        return { uid, name: userMap[uid]?.displayName || uid, pct,
          primary: `${pct}%`, secondary: `${s.correct}/${s.attempts} minority picks` };
      })
      .sort((a, b) => b.pct - a.pct);

    const upsetSpecialist = Object.entries(minStats)
      .filter(([uid, s]) => s.correct > 0 && userMap[uid])
      .map(([uid, s]) => ({
        uid, name: userMap[uid]?.displayName || uid, value: s.correct,
        primary: `${s.correct}`, secondary: `of ${s.attempts} minority picks`,
      }))
      .sort((a, b) => b.value - a.value);

    // ── Top Streak (missed matches don't break) ────────────────
    const sortedCompleted = [...completedMatches].sort(
      (a, b) => (toDate(a.kickoffTime) || 0) - (toDate(b.kickoffTime) || 0)
    );
    const topStreak = allUids
      .map((uid) => {
        const pm = {};
        (predsByUser[uid] || []).forEach((p) => { pm[p.matchId] = p; });
        let maxS = 0, cur = 0;
        sortedCompleted.forEach((m) => {
          const p = pm[m.id];
          if (!p || isLate(p)) return; // missed or late — skip, don't break
          if (isCorrect(p)) { cur++; maxS = Math.max(maxS, cur); } else cur = 0;
        });
        return { uid, name: userMap[uid]?.displayName || uid, value: maxS,
          primary: `${maxS}`, secondary: 'in a row' };
      })
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);

    // ── Group Stage MVP (non-knockout completed matches) ───────
    const gsIds = new Set(completedMatches.filter((m) => !m.isKnockout).map((m) => m.id));
    const groupStageMVP = allUids
      .map((uid) => {
        const gp = (predsByUser[uid] || []).filter((p) => gsIds.has(p.matchId) && !isLate(p));
        const correct = gp.filter(isCorrect).length;
        return { uid, name: userMap[uid]?.displayName || uid, pts: correct * 3, correct, total: gp.length,
          primary: `${correct * 3} pts`, secondary: `${correct}/${gp.length} correct` };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.pts - a.pts);

    // ── Perfect Round (knockout matches grouped by matchNumber order) ─
    const knockoutByNum = completedMatches
      .filter((m) => m.isKnockout)
      .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    const r32 = knockoutByNum.slice(0, 16);
    const r16 = knockoutByNum.slice(16, 24);

    function getPerfect(roundMs) {
      if (!roundMs.length) return [];
      return allUids
        .filter((uid) => {
          const pm = {};
          (predsByUser[uid] || []).forEach((p) => { pm[p.matchId] = p; });
          return roundMs.every((m) => { const p = pm[m.id]; return p && !isLate(p) && isCorrect(p); });
        })
        .map((uid) => ({ uid, name: userMap[uid]?.displayName || uid }));
    }

    // ── Wooden Spoon (most wrong on-time predictions) ──────────
    const woodenSpoon = allUids
      .map((uid) => {
        const cp = (predsByUser[uid] || []).filter((p) => completedIds.has(p.matchId) && !isLate(p));
        const wrong = cp.filter((p) => !isCorrect(p)).length;
        return { uid, name: userMap[uid]?.displayName || uid, value: wrong, total: cp.length,
          primary: `${wrong}`, secondary: `wrong of ${cp.length}` };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.value - a.value);

    return {
      mainLB, knockoutLB, mostActive, topAccurate, earlyBird,
      contrarian, upsetSpecialist, topStreak, groupStageMVP,
      perfectR32: getPerfect(r32), r32Count: r32.length,
      perfectR16: getPerfect(r16), r16Count: r16.length,
      woodenSpoon,
    };
  }, [users, preds, matches]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="spinner" /></div>;
  }
  if (!awards) {
    return <p className="text-center py-10 text-[14px]" style={{ color: 'var(--c-t2)' }}>Not enough data yet.</p>;
  }

  const {
    mainLB, knockoutLB, mostActive, topAccurate, earlyBird,
    contrarian, upsetSpecialist, topStreak, groupStageMVP,
    perfectR32, r32Count, perfectR16, r16Count, woodenSpoon,
  } = awards;

  return (
    <div className="max-w-2xl mx-auto px-2 py-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏅</span>
          <div>
            <h1 className="text-[20px] font-bold" style={{ color: 'var(--c-t1)' }}>Awards & Stats</h1>
            <p className="text-[12px]" style={{ color: 'var(--c-t2)' }}>Live · updates as matches are imported</p>
          </div>
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors"
          style={{ background: showAll ? 'var(--c-gold)' : 'var(--c-surface)', color: showAll ? '#0F172A' : 'var(--c-t2)', border: '1px solid var(--c-border)' }}
        >
          {showAll ? 'Top 3' : 'Show All'}
        </button>
      </div>

      <AwardSection emoji="🏆" title="Main Leaderboard" description="3 pts per correct on-time prediction · all matches">
        <RankList showAll={showAll} rows={mainLB} />
      </AwardSection>

      <AwardSection emoji="⚡" title="Knockout League" description="4 pts per correct on-time pick · Round of 32 onwards only">
        <RankList showAll={showAll} rows={knockoutLB} />
      </AwardSection>

      <AwardSection emoji="📊" title="Most Active" description="Total predictions made across all matches">
        <RankList showAll={showAll} rows={mostActive} />
      </AwardSection>

      <AwardSection emoji="🎯" title="Top Accurate" description="Highest correct % · minimum 20 on-time predictions in completed matches">
        <RankList showAll={showAll} rows={topAccurate} />
      </AwardSection>

      <AwardSection emoji="⏰" title="Early Bird" description="Voted earliest on average before kickoff · minimum 5 predictions with timestamps">
        <RankList showAll={showAll} rows={earlyBird} />
      </AwardSection>

      <AwardSection emoji="🦸" title="Contrarian" description="Picked against the majority and was right most often (rate %) · min 3 minority picks">
        <RankList showAll={showAll} rows={contrarian} />
      </AwardSection>

      <AwardSection emoji="💥" title="Upset Specialist" description="Most correct picks when voting against the majority (raw count)">
        <RankList showAll={showAll} rows={upsetSpecialist} />
      </AwardSection>

      <AwardSection emoji="🔥" title="Top Streak" description="Longest consecutive correct predictions · missed matches don't break the streak">
        <RankList showAll={showAll} rows={topStreak} />
      </AwardSection>

      <AwardSection emoji="⚽" title="Group Stage MVP" description="Best score across group stage matches only · 3 pts per correct pick">
        <RankList showAll={showAll} rows={groupStageMVP} />
      </AwardSection>

      <AwardSection emoji="✨" title={`Perfect Round — Round of 32 (${r32Count}/16)`} description="Got every single Round of 32 prediction correct">
        <PerfectRoundList achievers={perfectR32} totalMatches={r32Count} roundLabel="Round of 32" />
      </AwardSection>

      <AwardSection emoji="✨" title={`Perfect Round — Round of 16 (${r16Count}/8)`} description="Got every single Round of 16 prediction correct">
        <PerfectRoundList achievers={perfectR16} totalMatches={r16Count} roundLabel="Round of 16" />
      </AwardSection>

      <AwardSection emoji="🪣" title="Wooden Spoon" description="Most wrong on-time predictions in completed matches">
        <RankList showAll={showAll} rows={woodenSpoon} />
      </AwardSection>
    </div>
  );
}
