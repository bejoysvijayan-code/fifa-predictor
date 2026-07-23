import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getAllUsers, getMatches, getAllPredictions } from '../../firebase/services';
import { normalizeTeamName, sortLeaderboard } from '../../utils/scoring';

function toDate(v) {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function InfoRow({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <div>
        <div className="text-[14px] font-semibold" style={{ color: 'var(--c-t1)' }}>{title}</div>
        <div className="text-[12px]" style={{ color: 'var(--c-t2)' }}>{desc}</div>
      </div>
    </div>
  );
}

export default function ExportData() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(false);

  // User exclusion state
  const [allUsers, setAllUsers] = useState([]);
  const [excluded, setExcluded] = useState(new Set());
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    getAllUsers().then((users) => {
      setAllUsers(sortLeaderboard(users));
      setUsersLoading(false);
    });
  }, []);

  function toggleUser(uid) {
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  }

  function toggleAll() {
    if (excluded.size === 0) {
      setExcluded(new Set(allUsers.map((u) => u.id || u.uid)));
    } else {
      setExcluded(new Set());
    }
  }

  async function handleExport() {
    setLoading(true);
    setDone(false);
    setStatus('Fetching data…');

    try {
      const [matches, allPreds] = await Promise.all([getMatches(), getAllPredictions()]);

      const includedUsers = allUsers.filter((u) => !excluded.has(u.id || u.uid));
      const sortedUsers = includedUsers; // already sorted

      const completed = matches
        .filter((m) => m.status === 'completed' && m.result?.winner)
        .sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));

      setStatus('Building sheets…');

      // ── Sheet 1: Leaderboard ────────────────────────────────────
      const leaderboardRows = sortedUsers.map((u, i) => ({
        Rank: i + 1,
        Name: u.displayName || u.id,
        'Correct Picks': u.correctPredictions || 0,
        'Total Picks': u.totalPredictions || 0,
        'Accuracy %': u.accuracyPercentage || 0,
        Points: u.totalPoints || 0,
      }));

      // ── Sheet 2: All Predictions ────────────────────────────────
      const predRows = [];
      sortedUsers.forEach((u) => {
        const uid = u.id || u.uid;
        const name = u.displayName || uid;
        const userPreds = allPreds.filter((p) => p.userId === uid);

        completed.forEach((m) => {
          const pred = userPreds.find((p) => p.matchId === m.id);
          if (!pred) return;

          const isCorrect =
            normalizeTeamName(pred.prediction) === normalizeTeamName(m.result.winner);

          // predictionTime for CSV imports, timestamp for web-app votes
          const predDate = toDate(pred.predictionTime) ?? toDate(pred.timestamp);
          const kickoff = toDate(m.kickoffTime);

          const votedAt = predDate ? predDate.toLocaleString() : '';
          const kickoffAt = kickoff ? kickoff.toLocaleString() : '';
          const isLate =
            predDate && kickoff ? (predDate > kickoff ? 'Yes' : 'No') : '';

          predRows.push({
            Name: name,
            'Match #': m.matchNumber,
            Stage: m.isKnockout ? 'Knockout' : m.group ? `Group ${m.group}` : 'Group',
            'Home Team': m.homeTeam,
            'Away Team': m.awayTeam,
            'Kick Off': kickoffAt,
            'My Prediction': pred.prediction,
            'Actual Winner': m.result.winner,
            Result: isCorrect ? '✓' : '✗',
            'Voted At': votedAt,
            'Late?': isLate,
          });
        });
      });

      // ── Sheet 3: Match Stats ────────────────────────────────────
      const matchRows = completed.map((m) => {
        const preds = allPreds.filter((p) => p.matchId === m.id);
        const correct = preds.filter(
          (p) => normalizeTeamName(p.prediction) === normalizeTeamName(m.result.winner)
        ).length;
        const total = preds.length;
        const kickoff = toDate(m.kickoffTime);
        return {
          'Match #': m.matchNumber,
          Stage: m.isKnockout ? 'Knockout' : m.group ? `Group ${m.group}` : 'Group',
          'Kick Off': kickoff ? kickoff.toLocaleString() : '',
          'Home Team': m.homeTeam,
          'Away Team': m.awayTeam,
          Winner: m.result.winner,
          'Total Voted': total,
          Correct: correct,
          Wrong: total - correct,
          'Accuracy %': total > 0 ? Math.round((correct / total) * 100) : 0,
        };
      });

      // ── Sheet 4: Member Overview ────────────────────────────────
      const memberStatsRows = sortedUsers.map((u, i) => {
        const uid = u.id || u.uid;
        const userPreds = allPreds.filter((p) => p.userId === uid);

        const teamCount = {};
        userPreds.forEach((p) => {
          if (p.prediction) teamCount[p.prediction] = (teamCount[p.prediction] || 0) + 1;
        });
        const mostBacked = Object.entries(teamCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

        let sameAsCrowd = 0, crowdTotal = 0;
        userPreds.forEach((p) => {
          const matchPreds = allPreds.filter((x) => x.matchId === p.matchId);
          if (matchPreds.length < 2) return;
          const counts = {};
          matchPreds.forEach((x) => { if (x.prediction) counts[x.prediction] = (counts[x.prediction] || 0) + 1; });
          const topPick = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
          crowdTotal++;
          if (normalizeTeamName(p.prediction) === normalizeTeamName(topPick)) sameAsCrowd++;
        });
        const crowdPct = crowdTotal > 0 ? Math.round((sameAsCrowd / crowdTotal) * 100) : 0;
        const style = crowdPct >= 65 ? 'Safe Player' : crowdPct <= 35 ? 'Maverick' : 'Balanced';

        const participated = completed.filter((m) => userPreds.some((p) => p.matchId === m.id)).length;
        const participationPct = completed.length > 0 ? Math.round((participated / completed.length) * 100) : 0;

        return {
          Rank: i + 1,
          Name: u.displayName || uid,
          'Correct Picks': u.correctPredictions || 0,
          'Total Picks': u.totalPredictions || 0,
          'Accuracy %': u.accuracyPercentage || 0,
          Points: u.totalPoints || 0,
          'Most Backed Team': mostBacked,
          'Playing Style': style,
          'Crowd Agreement %': crowdPct,
          'Participation %': participationPct,
          'Matches Participated': participated,
          'Total Matches': completed.length,
        };
      });

      setStatus('Generating file…');

      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.json_to_sheet(leaderboardRows);
      setColWidths(ws1, [6, 24, 14, 12, 12, 8]);
      XLSX.utils.book_append_sheet(wb, ws1, 'Leaderboard');

      const ws2 = XLSX.utils.json_to_sheet(predRows);
      setColWidths(ws2, [24, 10, 12, 18, 18, 22, 18, 18, 8, 22, 8]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Predictions');

      const ws3 = XLSX.utils.json_to_sheet(matchRows);
      setColWidths(ws3, [10, 12, 22, 18, 18, 18, 12, 10, 10, 12]);
      XLSX.utils.book_append_sheet(wb, ws3, 'Match Stats');

      const ws4 = XLSX.utils.json_to_sheet(memberStatsRows);
      setColWidths(ws4, [6, 24, 14, 12, 12, 8, 18, 14, 18, 16, 18, 14]);
      XLSX.utils.book_append_sheet(wb, ws4, 'Member Overview');

      XLSX.writeFile(wb, 'FIFA_2026_Predictions.xlsx');
      setStatus('');
      setDone(true);
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const allExcluded = excluded.size === allUsers.length;
  const includeCount = allUsers.length - excluded.size;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-[18px] font-bold mb-1" style={{ color: 'var(--c-t1)' }}>Export to Excel</h2>
        <p className="text-[13px]" style={{ color: 'var(--c-t2)' }}>
          Download a spreadsheet with all prediction data across 4 sheets.
        </p>
      </div>

      {/* Sheet contents info */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
        <InfoRow icon="🏆" title="Leaderboard" desc="Rank, name, correct picks, accuracy %, points" />
        <InfoRow icon="🎯" title="Predictions" desc="Every member's pick for every match with kickoff time — filter by name in Excel" />
        <InfoRow icon="📋" title="Match Stats" desc="Per-match breakdown — kickoff, votes, correct, wrong, accuracy %" />
        <InfoRow icon="🧑‍🤝‍🧑" title="Member Overview" desc="Each member's stats: most backed team, playing style, crowd agreement, participation" />
      </div>

      {/* User exclusion list */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-semibold" style={{ color: 'var(--c-t1)' }}>
            Members to include
          </div>
          <button onClick={toggleAll}
            className="text-[12px] px-3 py-1 rounded-lg"
            style={{ background: 'var(--c-surface)', color: 'var(--c-t2)' }}>
            {allExcluded ? 'Select all' : 'Deselect all'}
          </button>
        </div>

        {usersLoading ? (
          <div className="text-[13px]" style={{ color: 'var(--c-t3)' }}>Loading members…</div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {allUsers.map((u, i) => {
              const uid = u.id || u.uid;
              const isExcluded = excluded.has(uid);
              return (
                <label key={uid}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer"
                  style={{ opacity: isExcluded ? 0.45 : 1 }}>
                  <input
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={() => toggleUser(uid)}
                    className="accent-current"
                    style={{ accentColor: 'var(--c-gold)', width: 15, height: 15 }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--c-t3)', minWidth: 20 }}>
                    #{i + 1}
                  </span>
                  <span className="text-[13px]" style={{ color: 'var(--c-t1)' }}>
                    {u.displayName || uid}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="text-[11px]" style={{ color: 'var(--c-t3)' }}>
          {includeCount} of {allUsers.length} members will be included
        </div>
      </div>

      {/* Download button */}
      <div className="space-y-3">
        <button
          onClick={handleExport}
          disabled={loading || includeCount === 0}
          className="w-full py-3 rounded-xl text-[14px] font-bold transition-opacity"
          style={{
            background: 'var(--c-gold)',
            color: '#0F172A',
            opacity: loading || includeCount === 0 ? 0.5 : 1,
            cursor: loading || includeCount === 0 ? 'not-allowed' : 'pointer',
          }}>
          {loading ? `⏳ ${status}` : `⬇️ Download Excel (${includeCount} members)`}
        </button>

        {done && (
          <p className="text-center text-[13px] font-medium" style={{ color: 'var(--c-green)' }}>
            ✓ FIFA_2026_Predictions.xlsx downloaded!
          </p>
        )}
        {!loading && status.startsWith('Error') && (
          <p className="text-center text-[13px]" style={{ color: 'var(--c-red)' }}>{status}</p>
        )}
      </div>

      <div className="rounded-xl p-4 text-[12px] space-y-1"
        style={{ background: 'var(--c-surface)', color: 'var(--c-t3)' }}>
        <p>💡 Open the file in Excel or Google Sheets.</p>
        <p>💡 In the <strong>Predictions</strong> sheet, filter the Name column to see one member's picks.</p>
        <p>💡 The <strong>Member Overview</strong> sheet is great to share with the group.</p>
      </div>
    </div>
  );
}

function setColWidths(ws, widths) {
  ws['!cols'] = widths.map((w) => ({ wch: w }));
}
