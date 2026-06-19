import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { useHouses } from '../contexts/HouseContext';
import ThemeToggle from './ThemeToggle';

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
function IconPoll() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h4v18H3zm7 8h4v10h-4zm7-5h4v15h-4z" />
    </svg>
  );
}
function IconSwitch() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

const TABS = [
  { to: '/', label: 'Home', Icon: IconHome },
  { to: '/matches', label: 'Matches', Icon: IconMatches },
  { to: '/leaderboard', label: 'Rankings', Icon: IconTrophy },
  { to: '/polls', label: 'Polls', Icon: IconPoll },
  { to: '/profile', label: 'Profile', Icon: IconUser },
];

const DESKTOP_EXTRA = [
  { to: '/my-predictions', label: 'My Picks' },
  { to: '/discover', label: 'Discover' },
  { to: '/activity', label: 'Activity' },
];

function MoreDropdown({ items, isAnyActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 flex items-center gap-1"
        style={{
          color: isAnyActive ? 'var(--c-primary)' : 'var(--c-t2)',
          background: isAnyActive ? 'var(--c-primary-bg)' : 'transparent',
        }}>
        More
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[140px] rounded-xl overflow-hidden z-50"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow)' }}>
          {items.map(({ to, label }) => (
            <NavLink key={to} to={to}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[13px] font-medium transition-all duration-150"
              style={({ isActive }) => ({
                color: isActive ? 'var(--c-primary)' : 'var(--c-t2)',
                background: isActive ? 'var(--c-primary-bg)' : 'transparent',
              })}>
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { activeGroup, myGroups, myProfile } = useGroup();
  const { houseColorMap } = useHouses();
  const houseColor = (myProfile?.houseId && houseColorMap[myProfile.houseId]) || 'var(--c-primary)';
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function isTabActive(path) {
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  }

  function handleSwitchGroup() {
    if (myGroups.length > 1) {
      navigate('/choose-group', { state: { switching: true } });
    }
  }

  const avatar = user?.photoURL ? (
    <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full"
      style={{ border: `2px solid ${houseColor}` }} />
  ) : (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
      style={{ background: houseColor, color: '#fff' }}>
      {user?.displayName?.[0] || '?'}
    </div>
  );

  const groupPill = activeGroup ? (
    <button
      onClick={handleSwitchGroup}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-all"
      style={{
        background: 'var(--c-primary-bg)',
        color: 'var(--c-primary)',
        border: '1px solid var(--c-primary-bd)',
        cursor: myGroups.length > 1 ? 'pointer' : 'default',
        maxWidth: '160px',
      }}
      title={myGroups.length > 1 ? 'Switch group' : activeGroup.name}
    >
      <span className="truncate">{activeGroup.name}</span>
      {myGroups.length > 1 && <span className="flex-shrink-0"><IconSwitch /></span>}
    </button>
  ) : null;

  return (
    <>
      {/* ── Top bar ─────────────────────────────── */}
      <nav className="glass sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 flex items-center h-14 gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)' }}>
              ⚽
            </div>
            <span className="font-bold text-[15px] tracking-tight hidden md:inline" style={{ color: 'var(--c-t1)' }}>
              FIFA Arena
            </span>
          </Link>

          {/* Group pill — shows on all screen sizes */}
          {groupPill}

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5 ml-2">
            {TABS.slice(0, -1).map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className="px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--c-primary)' : 'var(--c-t2)',
                  background: isActive ? 'var(--c-primary-bg)' : 'transparent',
                })}>
                {label}
              </NavLink>
            ))}
            <MoreDropdown
              items={DESKTOP_EXTRA}
              isAnyActive={DESKTOP_EXTRA.some(({ to }) => location.pathname.startsWith(to))}
            />
            {user?.isAdmin && (
              <NavLink to="/admin"
                className="px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150"
                style={({ isActive }) => ({
                  color: 'var(--c-gold)',
                  background: isActive ? 'var(--c-gold-bg)' : 'transparent',
                  opacity: isActive ? 1 : 0.65,
                })}>
                Admin
              </NavLink>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop: theme toggle + avatar + logout */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <NavLink to="/profile">{avatar}</NavLink>
            <button onClick={handleLogout}
              className="text-[12px] font-medium px-2 py-1 rounded-lg transition-colors"
              style={{ color: 'var(--c-t3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--c-red)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--c-t3)')}>
              Logout
            </button>
          </div>

          {/* Mobile: theme toggle + avatar */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle size={32} />
            <NavLink to="/profile">{avatar}</NavLink>
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ─────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--c-nav)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--c-nav-bd)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transition: 'background 0.2s ease, border-color 0.2s ease',
        }}>
        <div className="flex">
          {TABS.map(({ to, label, Icon }) => {
            const active = isTabActive(to);
            return (
              <Link key={to} to={to}
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
                style={{ transition: 'color 0.15s' }}>
                <span style={{ color: active ? 'var(--c-primary)' : 'var(--c-t3)' }}><Icon /></span>
                <span className="text-[10px] font-medium"
                  style={{ color: active ? 'var(--c-primary)' : 'var(--c-t3)' }}>
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
