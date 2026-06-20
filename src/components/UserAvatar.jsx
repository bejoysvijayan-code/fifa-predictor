import { useHouses } from '../contexts/HouseContext';

export default function UserAvatar({ user, className = '', imgStyle = {} }) {
  const { houseColorMap } = useHouses();
  const color = (user?.houseId && houseColorMap[user.houseId]) || null;

  if (user?.photoURL) {
    const resolvedStyle = color && !imgStyle.border
      ? { border: `2px solid ${color}`, ...imgStyle }
      : imgStyle;
    return (
      <img
        src={user.photoURL}
        alt={user.displayName}
        className={`rounded-full flex-shrink-0 ${className}`}
        style={resolvedStyle}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ background: color || 'var(--c-primary)', color: '#fff' }}
    >
      {user?.displayName?.[0] || '?'}
    </div>
  );
}
