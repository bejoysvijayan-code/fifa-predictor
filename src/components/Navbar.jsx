import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}
function IconMatches() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V18H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </svg>
  );
}
function IconList() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

const TABS = [
  { to: '/', label: 'Home', Icon: IconHome },
  { to: '/matches', label: 'Matches', Icon: IconMatches },
  { to: '/leaderboard', label: 'Rankings', Icon: IconTrophy },
  { to: '/my-predictions', label: 'My Picks', Icon: IconList },
  { to: '/profile', label: 'Profile', Icon: IconUser },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function isTabActive(path) {
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  }

  const avatar = user?.photoURL ? (
    <img
      src={user.photoURL}
      alt={user.displayName}
      className="w-8 h-8 rounded-full"
      style={{ border: '2px solid rgba(255,255,255,0.12)' }}
    />
  ) : (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
      style={{ background: '#5B6CF8' }}
    >
      {user?.displayName?.[0] || '?'}
    </div>
  );

  return (
    <>
      {/* ── Top bar ─────────────────────────────── */}
      <nav className="glass sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)' }}
            >
              ⚽
            </div>
            <span className="font-bold text-white text-[15px] tracking-tight hidden sm:inline">
              FIFA Predictor
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {TABS.slice(0, -1).map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'text-[#8B9CFF] bg-[rgba(91,108,248,0.10)]'
                      : 'text-[#6B7280] hover:text-[#E8EAFF] hover:bg-white/[0.04]'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {user?.isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'text-[#F0B429] bg-[rgba(240,180,41,0.10)]'
                      : 'text-[#F0B429]/50 hover:text-[#F0B429] hover:bg-white/[0.04]'
                  }`
                }
              >
                Admin
              </NavLink>
            )}
          </div>

          {/* Desktop: avatar + logout */}
          <div className="hidden md:flex items-center gap-3">
            <NavLink to="/profile">{avatar}</NavLink>
            <button
              onClick={handleLogout}
              className="text-[12px] font-medium px-2 py-1 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={(e) => (e.target.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.25)')}
            >
              Logout
            </button>
          </div>

          {/* Mobile: avatar only */}
          <NavLink to="/profile" className="md:hidden">{avatar}</NavLink>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ─────────────────── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(7, 7, 15, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex">
          {TABS.map(({ to, label, Icon }) => {
            const active = isTabActive(to);
            return (
              <Link
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
              >
                <span style={{ color: active ? '#5B6CF8' : 'rgba(255,255,255,0.28)' }}>
                  <Icon />
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: active ? '#8B9CFF' : 'rgba(255,255,255,0.28)' }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
