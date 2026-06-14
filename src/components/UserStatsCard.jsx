export default function UserStatsCard({ stats }) {
  const chips = [
    { label: 'Predictions', value: stats?.totalPredictions ?? 0,
      color: 'var(--c-t1)', bg: 'var(--c-surface)', border: 'var(--c-border)' },
    { label: 'Correct', value: stats?.correctPredictions ?? 0,
      color: 'var(--c-green)', bg: 'var(--c-green-bg)', border: 'var(--c-green-bd)' },
    { label: 'Accuracy', value: `${(stats?.accuracyPercentage ?? 0).toFixed(1)}%`,
      color: 'var(--c-primary)', bg: 'var(--c-primary-bg)', border: 'var(--c-primary-bd)' },
    { label: 'Points', value: stats?.totalPoints ?? 0,
      color: 'var(--c-gold)', bg: 'var(--c-gold-bg)', border: 'var(--c-gold-bd)' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="rounded-2xl p-4 text-center"
          style={{
            background: chip.bg,
            border: `1px solid ${chip.border}`,
            transition: 'background 0.2s, border-color 0.2s',
          }}
        >
          <div className="text-2xl font-bold tracking-tight" style={{ color: chip.color }}>
            {chip.value}
          </div>
          <div className="text-[11px] font-medium mt-0.5 uppercase tracking-wide" style={{ color: 'var(--c-t3)' }}>
            {chip.label}
          </div>
        </div>
      ))}
    </div>
  );
}
