import { useState } from 'react';
import * as XLSX from 'xlsx';
import { getAllUsers, getMatches, getAllPredictions } from '../../firebase/services';
import { normalizeTeamName, sortLeaderboard } from '../../utils/scoring';

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

  async function handleExport() {
    setLoading(true);
    setDone(false);
    setStatus('Fetching data…');

    try {
      const [users, matches, allPreds] = await Promise.all([
        getAllUsers(),
        getMatches(),
        getAllPredictions(),
      ]);

      const sortedUsers = sortLeaderboard(users);
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

          let votedAt = '';
          let isLate = '';
          if (pred.predictionTime) {
            const predDate = pred.predictionTime.toDate
              ? pred.predictionTime.toDate()
              : new Date(pred.predictionTime);
            const kickoff = m.kickoffTime?.toDate
              ? m.kickoffTime.toDate()
              : new Date(m.kickoffTime);
            votedAt = predDate.toLocaleString();
            isLate = predDate > kickoff ? 'Yes' : 'No';
          }

          predRows.push({
            Name: name,
            'Match #': m.matchNumber,
            Stage: m.isKnockout ? 'Knockout' : m.group ? `Group ${m.group}` : 'Group',
            'Home Team': m.homeTeam,
            'Away Team': m.awayTeam,
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
        return {
          'Match #': m.matchNumber,
          Stage: m.isKnockout ? 'Knockout' : m.group ? `Group ${m.group}` : 'Group',
          'Home Team': m.homeTeam,
          'Away Team': m.awayTeam,
          Winner: m.result.winner,
          'Total Voted': total,
          Correct: correct,
          Wrong: total - correct,
          'Accuracy %': total > 0 ? Math.round((correct / total) * 100) : 0,
        };
      });

      // ── Sheet 4: Member Stats (awards overview) ─────────────────
      const memberStatsRows = sortedUsers.map((u, i) => {
        const uid = u.id || u.uid;
        const userPreds = allPreds.filter((p) => p.userId === uid);

        // Most backed team
        const teamCount = {};
        userPreds.forEach((p) => {
          if (p.prediction) teamCount[p.prediction] = (teamCount[p.prediction] || 0) + 1;
        });
        const mostBacked = Object.entries(teamCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

        // Crowd agreement %
        let sameAsCrowd = 0;
        let crowdTotal = 0;
        userPreds.forEach((p) => {
          const matchPreds = allPreds.filter((x) => x.matchId === p.matchId);
          if (matchPreds.length < 2) return;
          const counts = {};
          matchPreds.forEach((x) => {
            if (x.prediction) counts[x.prediction] = (counts[x.prediction] || 0) + 1;
          });
          const topPick = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
          crowdTotal++;
          if (normalizeTeamName(p.prediction) === normalizeTeamName(topPick)) sameAsCrowd++;
        });
        const crowdPct = crowdTotal > 0 ? Math.round((sameAsCrowd / crowdTotal) * 100) : 0;
        const style =
          crowdPct >= 65 ? 'Safe Player 🐑' : crowdPct <= 35 ? 'Maverick 🦅' : 'Balanced ⚖️';

        // Participation %
        const participated = completed.filter((m) =>
          userPreds.some((p) => p.matchId === m.id)
        ).length;
        const participationPct =
          completed.length > 0 ? Math.round((participated / completed.length) * 100) : 0;

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

      // ── Build workbook ──────────────────────────────────────────
      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.json_to_sheet(leaderboardRows);
      setColWidths(ws1, [6, 24, 14, 12, 12, 8]);
      XLSX.utils.book_append_sheet(wb, ws1, 'Leaderboard');

      const ws2 = XLSX.utils.json_to_sheet(predRows);
      setColWidths(ws2, [24, 10, 12, 18, 18, 18, 18, 8, 22, 8]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Predictions');

      const ws3 = XLSX.utils.json_to_sheet(matchRows);
      setColWidths(ws3, [10, 12, 18, 18, 18, 12, 10, 10, 12]);
      XLSX.utils.book_append_sheet(wb, ws3, 'Match Stats');

      const ws4 = XLSX.utils.json_to_sheet(memberStatsRows);
      setColWidths(ws4, [6, 24, 14, 12, 12, 8, 18, 18, 18, 16, 18, 14]);
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

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-[18px] font-bold mb-1" style={{ color: 'var(--c-t1)' }}>
          Export to Excel
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--c-t2)' }}>
          Download a spreadsheet with all prediction data across 4 sheets.
        </p>
      </div>

      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}
      >
        <div className="space-y-3">
          <InfoRow icon="🏆" title="Leaderboard" desc="Rank, name, correct picks, accuracy %, points" />
          <InfoRow icon="🎯" title="Predictions" desc="Every member's pick for every match — filter by name in Excel" />
          <InfoRow icon="📋" title="Match Stats" desc="Per-match breakdown — total voted, correct, wrong, accuracy %" />
          <InfoRow icon="🧑‍🤝‍🧑" title="Member Overview" desc="Each member's stats: most backed team, playing style, crowd agreement, participation" />
        </div>

        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full py-3 rounded-xl text-[14px] font-bold transition-opacity"
          style={{
            background: 'var(--c-gold)',
            color: '#0F172A',
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? `⏳ ${status}` : '⬇️ Download Excel'}
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

      <div
        className="rounded-xl p-4 text-[12px] space-y-1"
        style={{ background: 'var(--c-surface)', color: 'var(--c-t3)' }}
      >
        <p>💡 Open the file in Excel or Google Sheets.</p>
        <p>💡 In the <strong>Predictions</strong> sheet, use column filters to see one member's picks.</p>
        <p>💡 The <strong>Member Overview</strong> sheet is great to share with the group as-is.</p>
      </div>
    </div>
  );
}

function setColWidths(ws, widths) {
  ws['!cols'] = widths.map((w) => ({ wch: w }));
}
