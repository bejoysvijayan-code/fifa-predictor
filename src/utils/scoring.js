export function sortLeaderboard(users) {
  return [...users].sort((a, b) => {
    if (b.correctPredictions !== a.correctPredictions)
      return b.correctPredictions - a.correctPredictions;
    if (b.accuracyPercentage !== a.accuracyPercentage)
      return b.accuracyPercentage - a.accuracyPercentage;
    return b.totalPoints - a.totalPoints;
  });
}

export function normalizeTeamName(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ');
}

export function getPredictionStatus(prediction, match) {
  if (!match || match.status !== 'completed' || !match.result) return 'pending';
  return normalizeTeamName(prediction) === normalizeTeamName(match.result.winner) ? 'correct' : 'incorrect';
}

export function isMatchLocked(kickoffTime) {
  if (!kickoffTime) return false;
  const kickoff =
    kickoffTime.toDate ? kickoffTime.toDate() : new Date(kickoffTime);
  return new Date() >= kickoff;
}

export function formatKickoff(kickoffTime) {
  if (!kickoffTime) return '';
  const d = kickoffTime.toDate ? kickoffTime.toDate() : new Date(kickoffTime);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TEAM_FLAGS = {
  Brazil: '🇧🇷',
  Argentina: '🇦🇷',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Spain: '🇪🇸',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Portugal: '🇵🇹',
  Netherlands: '🇳🇱',
  Belgium: '🇧🇪',
  Croatia: '🇭🇷',
  Morocco: '🇲🇦',
  Japan: '🇯🇵',
  USA: '🇺🇸',
  Mexico: '🇲🇽',
  Uruguay: '🇺🇾',
  Colombia: '🇨🇴',
  Italy: '🇮🇹',
  Poland: '🇵🇱',
  Switzerland: '🇨🇭',
  Australia: '🇦🇺',
  South_Korea: '🇰🇷',
  Senegal: '🇸🇳',
  Ghana: '🇬🇭',
  Cameroon: '🇨🇲',
  Serbia: '🇷🇸',
  Denmark: '🇩🇰',
  Ecuador: '🇪🇨',
  Qatar: '🇶🇦',
  Curacao: '🇨🇼',
  Curaçao: '🇨🇼',
};

export function getFlag(teamName) {
  const key = teamName?.replace(/\s+/g, '_');
  return TEAM_FLAGS[key] || '🏳️';
}
