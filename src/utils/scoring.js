import { getCountryCode } from './countryFlags';

export function sortLeaderboard(users) {
  return [...users].sort((a, b) => {
    if (b.correctPredictions !== a.correctPredictions)
      return b.correctPredictions - a.correctPredictions;
    if (b.accuracyPercentage !== a.accuracyPercentage)
      return b.accuracyPercentage - a.accuracyPercentage;
    return b.totalPoints - a.totalPoints;
  });
}

const TEAM_NAME_ALIASES = {
  'cabo verde': 'cape verde',
};

export function normalizeTeamName(name) {
  if (!name) return '';
  const n = name
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ');
  return TEAM_NAME_ALIASES[n] ?? n;
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
  Bosnia_and_Herzegovina: '🇧🇦',
  Bosnia_Herzegovina: '🇧🇦',
};

const SUBDIVISION_FLAGS = {
  'gb-eng': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'gb-sct': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'gb-wls': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'gb-nir': '🇬🇧',
};

export function getFlag(teamName) {
  if (!teamName) return '🏳️';
  const key = teamName.replace(/\s+/g, '_');
  if (TEAM_FLAGS[key]) return TEAM_FLAGS[key];
  const norm = normalizeTeamName(teamName);
  const entry = Object.entries(TEAM_FLAGS).find(([k]) => normalizeTeamName(k.replace(/_/g, ' ')) === norm);
  if (entry) return entry[1];
  // Fall back to countryFlags.js → generate emoji from ISO code
  const code = getCountryCode(teamName) ?? getCountryCode(norm);
  if (!code) return '🏳️';
  if (SUBDIVISION_FLAGS[code]) return SUBDIVISION_FLAGS[code];
  if (code.length === 2) {
    return [...code.toUpperCase()]
      .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join('');
  }
  return '🏳️';
}
