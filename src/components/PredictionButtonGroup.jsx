import { getFlag } from '../utils/scoring';

export default function PredictionButtonGroup({ homeTeam, awayTeam, selected, locked, onSelect }) {
  const options = [
    { value: homeTeam, label: homeTeam, flag: getFlag(homeTeam) },
    { value: 'Draw', label: 'Draw', flag: '🤝' },
    { value: awayTeam, label: awayTeam, flag: getFlag(awayTeam) },
  ];

  return (
    <div className="flex gap-2 mt-4">
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <button
            key={opt.value}
            disabled={locked}
            onClick={() => !locked && onSelect(opt.value)}
            className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-[12px] font-semibold transition-all duration-200"
            style={
              isSelected
                ? {
                    background: 'var(--c-primary-bg)',
                    border: '1px solid var(--c-primary-bd)',
                    color: 'var(--c-primary)',
                    boxShadow: '0 0 16px var(--c-primary-bg)',
                    transform: 'scale(1.03)',
                  }
                : locked
                ? {
                    background: 'var(--c-surface)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-t3)',
                    cursor: 'not-allowed',
                    opacity: 0.5,
                  }
                : {
                    background: 'var(--c-surface)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-t2)',
                    cursor: 'pointer',
                  }
            }
          >
            <span className="text-[17px]">{opt.flag}</span>
            <span className="truncate w-full text-center leading-tight">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
