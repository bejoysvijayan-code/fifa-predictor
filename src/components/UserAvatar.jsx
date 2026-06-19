import { useHouses } from '../contexts/HouseContext';

export default function UserAvatar({ user, className = '', imgStyle = {} }) {
  const { houseColorMap } = useHouses();
  const color = (user?.houseId && houseColorMap[user.houseId]) || 'var(--c-primary)';

  if (user?.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName}
        className={`rounded-full flex-shrink-0 ${className}`}
        style={imgStyle}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ background: color, color: '#fff' }}
    >
      {user?.displayName?.[0] || '?'}
    </div>
  );
}
