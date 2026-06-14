export default function UserStatsCard({ stats }) {
  const chips = [
    {
      label: 'Predictions',
      value: stats?.totalPredictions ?? 0,
      color: 'rgba(255,255,255,0.78)',
      bg: 'rgba(255,255,255,0.04)',
      border: 'rgba(255,255,255,0.08)',
    },
    {
      label: 'Correct',
      value: stats?.correctPredictions ?? 0,
      color: '#4ADE80',
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.16)',
    },
    {
      label: 'Accuracy',
      value: `${(stats?.accuracyPercentage ?? 0).toFixed(1)}%`,
      color: '#8B9CFF',
      bg: 'rgba(91,108,248,0.08)',
      border: 'rgba(91,108,248,0.16)',
    },
    {
      label: 'Points',
      value: stats?.totalPoints ?? 0,
      color: '#F0B429',
      bg: 'rgba(240,180,41,0.08)',
      border: 'rgba(240,180,41,0.16)',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="rounded-2xl p-4 text-center"
          style={{ background: chip.bg, border: `1px solid ${chip.border}` }}
        >
          <div className="text-2xl font-bold tracking-tight" style={{ color: chip.color }}>
            {chip.value}
          </div>
          <div className="text-[11px] font-medium mt-0.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {chip.label}
          </div>
        </div>
      ))}
    </div>
  );
}
