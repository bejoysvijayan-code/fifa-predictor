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
                    background: 'rgba(91,108,248,0.18)',
                    border: '1px solid rgba(91,108,248,0.45)',
                    color: '#8B9CFF',
                    boxShadow: '0 0 18px rgba(91,108,248,0.18)',
                    transform: 'scale(1.03)',
                  }
                : locked
                ? {
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.18)',
                    cursor: 'not-allowed',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    color: 'rgba(255,255,255,0.5)',
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
