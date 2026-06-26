import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { getMatches, getAllPredictions } from '../firebase/services';
import { normalizeTeamName } from '../utils/scoring';

const GREEN  = 'var(--c-green)';
const RED    = 'var(--c-red)';
const BLUE   = '#6366F1';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--c-t3)' }}>{label}</div>
      <div className="text-[24px] font-black" style={{ color: color || 'var(--c-t1)' }}>{value}</div>
      {sub && <div className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
      <div className="text-[13px] font-semibold mb-4" style={{ color: 'var(--c-t1)' }}>{title}</div>
      {children}
    </div>
  );
}

const CustomTooltipLine = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-[12px]"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', color: 'var(--c-t1)' }}>
      <div className="font-semibold mb-1">{label}</div>
      <div style={{ color: BLUE }}>{payload[0].value}% accuracy</div>
    </div>
  );
};

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-[12px]"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', color: 'var(--c-t1)' }}>
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function MatchStats() {
  const [matches, setMatches] = useState([]);
  const [allPreds, setAllPreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('charts');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([getMatches(), getAllPredictions()]).then(([m, p]) => {
      setMatches(m);
      setAllPreds(p);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  const completed = matches
    .filter((m) => m.status === 'completed' && m.result?.winner)
    .sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));

  const stats = completed.map((m) => {
    const preds = allPreds.filter((p) => p.matchId === m.id);
    const correct = preds.filter(
      (p) => normalizeTeamName(p.prediction) === normalizeTeamName(m.result.winner)
    ).length;
    const wrong = preds.length - correct;
    const accuracy = preds.length > 0 ? Math.round((correct / preds.length) * 100) : 0;
    return { match: m, total: preds.length, correct, wrong, accuracy };
  });

  // Summary numbers
  const totalCorrect = stats.reduce((s, x) => s + x.correct, 0);
  const totalVotes   = stats.reduce((s, x) => s + x.total, 0);
  const overallAcc   = totalVotes > 0 ? Math.round((totalCorrect / totalVotes) * 100) : 0;
  const bestMatch    = [...stats].sort((a, b) => b.accuracy - a.accuracy)[0];
  const worstMatch   = [...stats].filter(s => s.total > 0).sort((a, b) => a.accuracy - b.accuracy)[0];
  const everyoneWrong = stats.filter(s => s.total > 0 && s.correct === 0).length;

  // Line chart data — accuracy trend
  const lineData = stats.map((s) => ({
    name: `M${s.match.matchNumber ?? '?'}`,
    accuracy: s.accuracy,
  }));

  // Bar chart data — correct vs wrong per match
  const barData = stats.map((s) => ({
    name: `M${s.match.matchNumber ?? '?'}`,
    correct: s.correct,
    wrong: s.wrong,
  }));

  // Most picked teams
  const teamVotes = {};
  allPreds.forEach((p) => {
    if (!p.prediction) return;
    teamVotes[p.prediction] = (teamVotes[p.prediction] || 0) + 1;
  });
  const teamData = Object.entries(teamVotes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([team, count]) => ({ team: team.length > 12 ? team.slice(0, 11) + '…' : team, count }));

  // Filtered list
  const filtered =
    filter === 'everyone_wrong' ? stats.filter((s) => s.total > 0 && s.correct === 0)
    : filter === 'everyone_right' ? stats.filter((s) => s.total > 0 && s.wrong === 0)
    : stats;

  const tickStyle = { fill: 'var(--c-t3)', fontSize: 10 };
  const gridColor = 'var(--c-border)';

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
          Match Stats
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--c-t2)' }}>
          {completed.length} completed matches · prediction accuracy
        </p>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        {[{ id: 'charts', label: '📊 Charts' }, { id: 'list', label: '📋 Match List' }].map(({ id, label }) => (
          <button key={id} onClick={() => setView(id)}
            className="px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
            style={view === id
              ? { background: 'var(--c-card)', color: 'var(--c-t1)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
              : { color: 'var(--c-t3)', background: 'transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CHARTS VIEW ── */}
      {view === 'charts' && (
        <div className="space-y-4">

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Overall Accuracy" value={`${overallAcc}%`}
              sub={`${totalCorrect} of ${totalVotes} correct`}
              color={overallAcc >= 50 ? 'var(--c-green)' : 'var(--c-red)'} />
            <StatCard label="Everyone Wrong" value={everyoneWrong}
              sub={`match${everyoneWrong !== 1 ? 'es' : ''} nobody got right`}
              color="var(--c-red)" />
            {bestMatch && (
              <StatCard label="Best Match" value={`${bestMatch.accuracy}%`}
                sub={`M${bestMatch.match.matchNumber} · ${bestMatch.match.homeTeam} vs ${bestMatch.match.awayTeam}`}
                color="var(--c-green)" />
            )}
            {worstMatch && worstMatch.accuracy < 100 && (
              <StatCard label="Worst Match" value={`${worstMatch.accuracy}%`}
                sub={`M${worstMatch.match.matchNumber} · ${worstMatch.match.homeTeam} vs ${worstMatch.match.awayTeam}`}
                color="var(--c-red)" />
            )}
          </div>

          {/* Accuracy trend line chart */}
          {lineData.length > 1 && (
            <ChartCard title="Accuracy Trend — Match by Match">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={tickStyle} />
                  <YAxis domain={[0, 100]} tick={tickStyle} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltipLine />} />
                  <Line type="monotone" dataKey="accuracy" stroke={BLUE} strokeWidth={2}
                    dot={{ r: 3, fill: BLUE }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Correct vs Wrong bar chart */}
          {barData.length > 0 && (
            <ChartCard title="Correct vs Wrong — Per Match">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={tickStyle} />
                  <YAxis tick={tickStyle} allowDecimals={false} />
                  <Tooltip content={<CustomTooltipBar />} />
                  <Bar dataKey="correct" name="Correct" stackId="a" fill="#22C55E" radius={[0,0,0,0]} />
                  <Bar dataKey="wrong"   name="Wrong"   stackId="a" fill="#EF4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--c-t3)' }}>
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#22C55E' }} /> Correct
                </span>
                <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--c-t3)' }}>
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#EF4444' }} /> Wrong
                </span>
              </div>
            </ChartCard>
          )}

          {/* Most picked teams */}
          {teamData.length > 0 && (
            <ChartCard title="Most Picked Teams">
              <ResponsiveContainer width="100%" height={teamData.length * 32 + 10}>
                <BarChart data={teamData} layout="vertical" margin={{ top: 0, right: 8, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                  <YAxis type="category" dataKey="team" tick={{ ...tickStyle, fontSize: 11 }} width={80} />
                  <Tooltip content={<CustomTooltipBar />} />
                  <Bar dataKey="count" name="Picks" radius={[0, 3, 3, 0]}>
                    {teamData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : BLUE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      {/* ── MATCH LIST VIEW ── */}
      {view === 'list' && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-4 w-fit"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            {[
              { id: 'all',            label: 'All' },
              { id: 'everyone_wrong', label: '❌ Everyone Wrong' },
              { id: 'everyone_right', label: '✅ Everyone Right' },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setFilter(id)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap"
                style={filter === id
                  ? { background: 'var(--c-card)', color: 'var(--c-t1)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
                  : { color: 'var(--c-t3)', background: 'transparent' }}>
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="text-5xl">🏆</span>
              <p className="text-[14px]" style={{ color: 'var(--c-t3)' }}>No matches found.</p>
            </div>
          )}

          <div className="space-y-3">
            {filtered.map(({ match: m, total, correct, wrong, accuracy }) => {
              const allWrong = total > 0 && correct === 0;
              const allRight = total > 0 && wrong === 0;
              return (
                <div key={m.id} className="rounded-2xl p-4"
                  style={{
                    background: 'var(--c-card)',
                    border: `1px solid ${allWrong ? 'var(--c-red)' : allRight ? 'var(--c-green)' : 'var(--c-border)'}`,
                  }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--c-surface)', color: 'var(--c-t3)' }}>
                          Match {m.matchNumber}
                        </span>
                        {m.group && <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>Group {m.group}</span>}
                        {allWrong && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--c-red)' }}>
                            Everyone wrong!
                          </span>
                        )}
                        {allRight && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--c-green)' }}>
                            Everyone right!
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[15px] font-semibold truncate" style={{ color: 'var(--c-t1)' }}>
                        {m.homeTeam} vs {m.awayTeam}
                      </div>
                      <div className="text-[12px] mt-0.5" style={{ color: 'var(--c-t3)' }}>
                        Result: <span className="font-semibold" style={{ color: 'var(--c-primary)' }}>{m.result.winner}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-center">
                      <div className="text-[20px] font-black"
                        style={{ color: accuracy >= 50 ? 'var(--c-green)' : 'var(--c-red)' }}>
                        {accuracy}%
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--c-t3)' }}>accuracy</div>
                    </div>
                  </div>
                  {total > 0 && (
                    <div className="rounded-full overflow-hidden h-2 mb-3" style={{ background: 'var(--c-surface)' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${accuracy}%`, background: 'var(--c-green)', minWidth: correct > 0 ? 4 : 0 }} />
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'var(--c-green)' }}>
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.2" />
                        <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {correct} correct
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'var(--c-red)' }}>
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.2" />
                        <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      {wrong} wrong
                    </span>
                    <span className="text-[12px] ml-auto" style={{ color: 'var(--c-t3)' }}>{total} voted</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
