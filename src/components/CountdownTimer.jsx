import { useEffect, useState } from 'react';

function getTimeLeft(kickoffTime) {
  if (!kickoffTime) return null;
  const target = kickoffTime.toDate ? kickoffTime.toDate() : new Date(kickoffTime);
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

const pad = (n) => String(n).padStart(2, '0');

export default function CountdownTimer({ kickoffTime, compact = false }) {
  const [t, setT] = useState(() => getTimeLeft(kickoffTime));

  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(kickoffTime)), 1000);
    return () => clearInterval(id);
  }, [kickoffTime]);

  if (!t) {
    return (
      <span className="text-xs font-bold" style={{ color: 'var(--c-red)' }}>
        Kickoff!
      </span>
    );
  }

  if (compact) {
    if (t.days > 0)   return <span>{t.days}d {t.hours}h</span>;
    if (t.hours > 0)  return <span>{t.hours}h {pad(t.minutes)}m</span>;
    return <span>{pad(t.minutes)}:{pad(t.seconds)}</span>;
  }

  const units = [
    { label: 'Days', v: t.days },
    { label: 'Hrs',  v: t.hours },
    { label: 'Min',  v: t.minutes },
    { label: 'Sec',  v: t.seconds },
  ];

  return (
    <div className="flex items-center gap-1">
      {units.map(({ label, v }, i) => (
        <div key={label} className="flex items-center gap-1">
          <div
            className="flex flex-col items-center"
            style={{
              background: 'var(--c-surface)',
              border: '1px solid var(--c-border-s)',
              borderRadius: 8,
              padding: '5px 8px',
              minWidth: 40,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--c-t1)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}
            >
              {pad(v)}
            </span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 600,
                color: 'var(--c-t3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: 2,
              }}
            >
              {label}
            </span>
          </div>
          {i < 3 && (
            <span style={{ fontWeight: 800, color: 'var(--c-t3)', fontSize: 14 }}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}
