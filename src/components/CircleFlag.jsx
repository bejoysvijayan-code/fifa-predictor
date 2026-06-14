import { useState } from 'react';
import { getCountryCode } from '../utils/countryFlags';
import { getFlag } from '../utils/scoring';

const CDN = 'https://hatscripts.github.io/circle-flags/flags';

/**
 * Renders a circular country flag from the HatScripts/circle-flags CDN.
 * Falls back to the emoji flag if the country code isn't mapped or the
 * image fails to load.
 *
 * @param {string}  team  - Team name matching a key in COUNTRY_CODES
 * @param {number}  size  - Diameter in pixels (default 32)
 * @param {string}  className - Optional extra Tailwind classes
 */
export default function CircleFlag({ team, size = 32, className = '' }) {
  const [errored, setErrored] = useState(false);
  const code = getCountryCode(team);

  if (!code || errored) {
    return (
      <span
        role="img"
        aria-label={team}
        style={{ fontSize: Math.max(Math.round(size * 0.75), 14), lineHeight: 1, display: 'inline-block' }}
      >
        {getFlag(team)}
      </span>
    );
  }

  return (
    <img
      src={`${CDN}/${code}.svg`}
      width={size}
      height={size}
      alt={`${team} flag`}
      className={className}
      draggable={false}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'inline-block',
        flexShrink: 0,
        userSelect: 'none',
      }}
      onError={() => setErrored(true)}
    />
  );
}
