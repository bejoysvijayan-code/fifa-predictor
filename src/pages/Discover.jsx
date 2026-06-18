import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { getPublicGroups, getOpenPollsForGroups, joinPublicGroup, logActivity, getRecentActivity, getMatches } from '../firebase/services';
import { getCountryCode } from '../utils/countryFlags';
import ThemeToggle from '../components/ThemeToggle';

function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const GRADIENTS = [
  'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
  'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  'linear-gradient(135deg, #EC4899 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #14B8A6 0%, #3B82F6 100%)',
];

function HeroIllustration() {
  return (
    <div className="relative flex items-center justify-center select-none" style={{ height: 300 }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }} />
      </div>

      <div className="relative w-28 h-28 rounded-full flex items-center justify-center text-5xl z-10"
        style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 8px 40px rgba(79,70,229,0.45)' }}>
        ⚽
      </div>

      {/* Poll card */}
      <div className="absolute top-2 left-0 rounded-2xl p-3.5 w-44 z-20"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
        <p className="text-[11px] font-bold mb-2.5" style={{ color: 'var(--c-t1)' }}>Who wins the final?</p>
        {[{ label: 'Argentina', pct: 62 }, { label: 'France', pct: 38 }].map(({ label, pct }) => (
          <div key={label} className="mb-2">
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--c-t3)' }}>
              <span>{label}</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-surface)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4F46E5, #7C3AED)' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Members card */}
      <div className="absolute bottom-8 right-0 rounded-2xl p-3.5 z-20"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, #10B981, #0EA5E9)' }}>👥</div>
          <div>
            <div className="text-[14px] font-black" style={{ color: 'var(--c-t1)' }}>1,240+</div>
            <div className="text-[10px]" style={{ color: 'var(--c-t3)' }}>Active Members</div>
          </div>
        </div>
      </div>

      {/* Live badge */}
      <div className="absolute top-10 right-6 rounded-xl px-3 py-2 z-20"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#10B981' }}>24 Live Polls</span>
        </div>
      </div>
    </div>
  );
}

function ActivityCarousel({ items }) {
  const scrollRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [current, setCurrent] = useState(0);

  const CARD_W = 288 + 16;

  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = setInterval(() => {
      setCurrent((c) => {
        const next = (c + 1) % items.length;
        scrollRef.current?.scrollTo({ left: next * CARD_W, behavior: 'smooth' });
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [paused, items.length]);

  function goTo(i) {
    setCurrent(i);
    scrollRef.current?.scrollTo({ left: i * CARD_W, behavior: 'smooth' });
  }

  const getLabel = (a) => {
    if (a.type === 'poll_vote') return `${a.displayName || 'Someone'} voted on "${a.pollQuestion}"`;
    if (a.type === 'prediction') return `${a.displayName || 'Someone'} made a prediction`;
    if (a.type === 'member_join') return `${a.displayName || 'Someone'} joined ${a.groupName}`;
    if (a.type === 'poll_created') return `New poll: "${a.pollQuestion}"`;
    return a.type;
  };

  const ICONS = { poll_vote: '📊', prediction: '⚽', member_join: '👋', poll_created: '📝' };

  const getAgo = (a) => {
    const ts = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || Date.now());
    const mins = Math.floor((Date.now() - ts.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {items.map((a, i) => (
          <div key={a.id || i}
            className="flex-shrink-0 w-72 rounded-2xl p-4 flex items-start gap-3 cursor-default"
            style={{
              background: 'var(--c-card)',
              border: `1px solid ${i === current ? 'var(--c-primary)' : 'var(--c-border)'}`,
              boxShadow: 'var(--c-shadow)',
              transition: 'border-color 0.3s',
            }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'var(--c-surface)' }}>
              {ICONS[a.type] || '•'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] leading-snug" style={{ color: 'var(--c-t2)' }}>{getLabel(a)}</p>
              <span className="text-[11px] mt-1 block" style={{ color: 'var(--c-t3)' }}>{getAgo(a)}</span>
            </div>
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={() => goTo((current - 1 + items.length) % items.length)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] transition-all"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }}>
            ←
          </button>
          {items.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                height: 6,
                width: i === current ? 20 : 6,
                background: i === current ? 'var(--c-primary)' : 'var(--c-border)',
              }} />
          ))}
          <button onClick={() => goTo((current + 1) % items.length)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] transition-all"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }}>
            →
          </button>
        </div>
      )}
    </div>
  );
}

function PollCard({ poll, groupName, isMember, user, onJoin, joining }) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow)', transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(79,70,229,0.18)'; e.currentTarget.style.borderColor = 'rgba(79,70,229,0.4)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--c-shadow)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}>

      <div className="h-1" style={{ background: 'linear-gradient(90deg, #4F46E5, #7C3AED, #06B6D4)' }} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}>
            {poll.type === 'prediction' ? '🎯 Prediction' : '📊 Poll'}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-green)' }} />
            Live
          </span>
          <span className="text-[10px] ml-auto truncate max-w-[110px]" style={{ color: 'var(--c-t3)' }}>{groupName}</span>
        </div>

        <p className="text-[14px] font-bold leading-snug" style={{ color: 'var(--c-t1)' }}>{poll.question}</p>

        <div className="space-y-1.5 flex-1">
          {poll.options.slice(0, 3).map((opt) => (
            <div key={opt} className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-[12px]"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#4F46E5' }} />
              <span className="truncate">{opt}</span>
            </div>
          ))}
          {poll.options.length > 3 && (
            <p className="text-[11px] pl-1" style={{ color: 'var(--c-t3)' }}>+{poll.options.length - 3} more options</p>
          )}
        </div>

        {isMember ? (
          <Link to="/polls"
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-center block mt-1"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff' }}>
            Vote Now →
          </Link>
        ) : (
          <button onClick={() => onJoin(poll.groupId)} disabled={joining === poll.groupId}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold mt-1 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff' }}>
            {joining === poll.groupId ? 'Joining…' : user ? 'Join & Vote' : 'Sign in to Vote'}
          </button>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group, pollCount, isMember, user, onJoin, joining, index }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow)', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--c-shadow)'; }}>

      <div className="h-20 relative flex items-end px-4" style={{ background: gradient }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl z-10 translate-y-6"
          style={{ background: 'var(--c-card)', border: '3px solid var(--c-card)' }}>
          👥
        </div>
        <div className="ml-auto mb-2 z-10">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', backdropFilter: 'blur(8px)' }}>
            Public
          </span>
        </div>
      </div>

      <div className="p-5 pt-9 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="text-[15px] font-bold" style={{ color: 'var(--c-t1)' }}>{group.name}</h3>
          <p className="text-[12px] mt-1 line-clamp-2" style={{ color: 'var(--c-t3)' }}>
            {group.description || 'Public community group — join and start predicting'}
          </p>
        </div>

        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <div className="text-center flex-1">
            <div className="text-[14px] font-black" style={{ color: 'var(--c-t1)' }}>{pollCount}</div>
            <div className="text-[10px]" style={{ color: 'var(--c-t3)' }}>Active Polls</div>
          </div>
          <div className="w-px h-6" style={{ background: 'var(--c-border)' }} />
          <div className="text-center flex-1 flex flex-col items-center">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
            <div className="text-[10px] mt-1" style={{ color: 'var(--c-t3)' }}>Open</div>
          </div>
        </div>

        <div className="mt-auto">
          {isMember ? (
            <Link to="/polls"
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-center block"
              style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}>
              View Polls →
            </Link>
          ) : (
            <button onClick={() => onJoin(group.id)} disabled={joining === group.id}
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-60"
              style={{ background: gradient, color: '#fff' }}>
              {joining === group.id ? 'Joining…' : user ? 'Join Group' : 'Sign in to Join'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamFlag({ name, size = 32 }) {
  const code = getCountryCode(name);
  if (code) {
    return (
      <img
        src={`https://hatscripts.github.io/circle-flags/flags/${code}.svg`}
        width={size} height={size}
        alt={name}
        className="rounded-full flex-shrink-0"
        style={{ border: '1.5px solid var(--c-border)' }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold"
      style={{ width: size, height: size, background: 'var(--c-surface)', border: '1.5px solid var(--c-border)', color: 'var(--c-t3)', fontSize: 12 }}>
      {name?.[0] || '?'}
    </div>
  );
}

function MatchCard({ match }) {
  const kickoff = match.kickoffTime?.toDate ? match.kickoffTime.toDate() : new Date(match.kickoffTime);
  const now = new Date();
  const diffMs = kickoff - now;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);

  let countdown, countdownColor;
  if (diffMs < 0) { countdown = 'Kicked off'; countdownColor = 'var(--c-t3)'; }
  else if (diffHrs < 1) { countdown = 'Starting soon'; countdownColor = '#EF4444'; }
  else if (diffHrs < 24) { countdown = `In ${diffHrs}h`; countdownColor = '#F59E0B'; }
  else { countdown = `In ${diffDays}d`; countdownColor = 'var(--c-primary)'; }

  const dateStr = kickoff.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = kickoff.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow)', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(79,70,229,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--c-shadow)'; }}>

      <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #4F46E5, #7C3AED, #06B6D4)' }} />

      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        {match.matchNumber && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }}>
            Match {match.matchNumber}
          </span>
        )}
        <span className="text-[11px] font-bold ml-auto" style={{ color: countdownColor }}>{countdown}</span>
      </div>

      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamFlag name={match.homeTeam} size={36} />
          <span className="text-[11px] font-semibold text-center leading-tight w-full truncate" style={{ color: 'var(--c-t1)' }}>
            {match.homeTeam}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <span className="text-[15px] font-black" style={{ color: 'var(--c-t3)' }}>vs</span>
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamFlag name={match.awayTeam} size={36} />
          <span className="text-[11px] font-semibold text-center leading-tight w-full truncate" style={{ color: 'var(--c-t1)' }}>
            {match.awayTeam}
          </span>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center justify-center gap-1.5">
        <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>📅 {dateStr}</span>
        <span style={{ color: 'var(--c-border)' }}>·</span>
        <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>🕐 {timeStr}</span>
      </div>
    </div>
  );
}

export default function Discover() {
  const { user, loginWithGoogle } = useAuth();
  const { myGroups } = useGroup();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [polls, setPolls] = useState([]);
  const [activity, setActivity] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  const pollsRef = useRef(null);
  const groupsRef = useRef(null);
  const matchesRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const gs = await getPublicGroups();
        setGroups(gs);
        if (gs.length) {
          const ps = await getOpenPollsForGroups(gs.map((g) => g.id));
          setPolls(ps);
        }
      } finally {
        setLoading(false);
      }
      // Activity requires auth — fetch separately so failures don't block groups/polls
      try {
        const acts = await getRecentActivity(10);
        setActivity(acts);
      } catch {}
      // Matches are public
      try {
        const now = new Date();
        const all = await getMatches();
        const upcoming = all
          .filter((m) => {
            if (m.status === 'completed') return false;
            const t = m.kickoffTime?.toDate ? m.kickoffTime.toDate() : new Date(m.kickoffTime);
            return t > now;
          })
          .sort((a, b) => {
            const ta = a.kickoffTime?.toDate ? a.kickoffTime.toDate() : new Date(a.kickoffTime);
            const tb = b.kickoffTime?.toDate ? b.kickoffTime.toDate() : new Date(b.kickoffTime);
            return ta - tb;
          })
          .slice(0, 8);
        setMatches(upcoming);
      } catch {}
    }
    load();
  }, []);

  const myGroupIds = new Set((myGroups || []).map((g) => g.id));

  async function handleJoin(groupId) {
    if (!user) { navigate('/login?redirect=/discover'); return; }
    setJoining(groupId);
    try {
      await joinPublicGroup(groupId, user.uid);
      logActivity('member_join', {
        userId: user.uid,
        displayName: user.displayName || 'Someone',
        groupId,
        groupName: groups.find((g) => g.id === groupId)?.name || groupId,
      });
      navigate('/polls');
    } catch (e) {
      console.error(e);
      setJoining(null);
    }
  }

  const groupNameMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen" style={{ background: 'var(--c-page)', transition: 'background 0.2s ease' }}>

      {/* ── Nav ── */}
      <nav className="glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)' }}>
              ⚽
            </div>
            <span className="font-bold text-[15px] tracking-tight" style={{ color: 'var(--c-t1)' }}>
              JNVN98: FIFA Arena
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-0.5">
            <Link to="/" className="px-3 py-2 rounded-xl text-[13px] font-medium" style={{ color: 'var(--c-t2)' }}>Home</Link>
            <button onClick={() => scrollTo(matchesRef)} className="px-3 py-2 rounded-xl text-[13px] font-medium" style={{ color: 'var(--c-t2)' }}>Matches</button>
            <button onClick={() => scrollTo(pollsRef)} className="px-3 py-2 rounded-xl text-[13px] font-medium" style={{ color: 'var(--c-t2)' }}>Polls</button>
            <button onClick={() => scrollTo(groupsRef)} className="px-3 py-2 rounded-xl text-[13px] font-medium" style={{ color: 'var(--c-t2)' }}>Groups</button>
            <Link to="/activity" className="px-3 py-2 rounded-xl text-[13px] font-medium" style={{ color: 'var(--c-t2)' }}>Activity</Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle size={34} />
            {user ? (
              <Link to="/" className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: 'var(--c-primary)', color: '#fff' }}>
                My Dashboard
              </Link>
            ) : (
              <button onClick={loginWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: 'var(--c-primary)', color: '#fff' }}>
                <GoogleIcon size={14} />
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-primary)' }} />
              Live polls available now
            </div>

            <h1 className="text-[36px] sm:text-[48px] font-black tracking-tight leading-[1.1]"
              style={{ color: 'var(--c-t1)' }}>
              Discover, Join &{' '}
              <span style={{ background: 'linear-gradient(90deg, #4F46E5, #7C3AED, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Vote
              </span>
              {' '}in Community Polls
            </h1>

            <p className="text-[16px] leading-relaxed" style={{ color: 'var(--c-t2)' }}>
              Participate in public communities and make your voice count. Join groups, predict match outcomes, and see where your community stands.
            </p>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => scrollTo(pollsRef)}
                className="px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
                Explore Polls →
              </button>
              {!user ? (
                <button onClick={loginWithGoogle}
                  className="px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:opacity-90"
                  style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', color: 'var(--c-t1)' }}>
                  Create Account
                </button>
              ) : (
                <button onClick={() => scrollTo(groupsRef)}
                  className="px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:opacity-90"
                  style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', color: 'var(--c-t1)' }}>
                  Browse Groups
                </button>
              )}
            </div>

            <div className="flex items-center gap-8 pt-1">
              {[
                { value: loading ? '—' : `${groups.length}`, label: 'Public Groups' },
                { value: loading ? '—' : `${polls.length}`, label: 'Active Polls' },
                { value: '100%', label: 'Free to Join' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-[22px] font-black" style={{ color: 'var(--c-t1)' }}>{value}</div>
                  <div className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* ── Activity Feed ── */}
      {activity.length > 0 && (
        <section className="py-12" style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
              <h2 className="text-[18px] font-bold" style={{ color: 'var(--c-t1)' }}>Latest Community Activity</h2>
            </div>
            <ActivityCarousel items={activity} />
          </div>
        </section>
      )}

      {/* ── Upcoming Matches ── */}
      {(matches.length > 0 || loading) && (
        <section ref={matchesRef} className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--c-primary)' }}>Coming Up</p>
              <h2 className="text-[26px] font-black" style={{ color: 'var(--c-t1)' }}>Upcoming Matches</h2>
            </div>
            {!loading && matches.length > 0 && (
              <span className="text-[12px] font-semibold px-3 py-1 rounded-full"
                style={{ background: 'var(--c-primary-bg)', color: 'var(--c-primary)', border: '1px solid var(--c-primary-bd)' }}>
                Next {matches.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl h-36 animate-pulse" style={{ background: 'var(--c-surface)' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {matches.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          )}
        </section>
      )}

      {/* ── Active Polls ── */}
      <section ref={pollsRef} className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--c-primary)' }}>Live Right Now</p>
            <h2 className="text-[26px] font-black" style={{ color: 'var(--c-t1)' }}>Active Polls</h2>
          </div>
          {!loading && polls.length > 0 && (
            <span className="text-[12px] font-semibold px-3 py-1 rounded-full"
              style={{ background: 'var(--c-green-bg)', color: 'var(--c-green)', border: '1px solid var(--c-green-bd)' }}>
              {polls.length} open
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="rounded-2xl h-64 animate-pulse" style={{ background: 'var(--c-surface)' }} />)}
          </div>
        ) : polls.length === 0 ? (
          <div className="rounded-2xl py-16 flex flex-col items-center gap-3"
            style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <span className="text-4xl">📊</span>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--c-t2)' }}>No active polls right now</p>
            <p className="text-[12px]" style={{ color: 'var(--c-t3)' }}>Check back soon or join a group to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {polls.map((p) => (
              <PollCard key={p.id} poll={p} groupName={groupNameMap[p.groupId] || p.groupId}
                isMember={myGroupIds.has(p.groupId)} user={user} onJoin={handleJoin} joining={joining} />
            ))}
          </div>
        )}
      </section>

      {/* ── Groups ── */}
      <section ref={groupsRef} className="py-16"
        style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--c-primary)' }}>Open to Everyone</p>
            <h2 className="text-[26px] font-black" style={{ color: 'var(--c-t1)' }}>Find Your Community</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => <div key={i} className="rounded-2xl h-56 animate-pulse" style={{ background: 'var(--c-card)' }} />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl py-16 flex flex-col items-center gap-3"
              style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
              <span className="text-4xl">👥</span>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--c-t2)' }}>No public groups yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map((g, i) => (
                <GroupCard key={g.id} group={g} pollCount={polls.filter((p) => p.groupId === g.id).length}
                  isMember={myGroupIds.has(g.id)} user={user} onJoin={handleJoin} joining={joining} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 text-center" style={{ borderTop: '1px solid var(--c-border)' }}>
        <p className="text-[12px]" style={{ color: 'var(--c-t3)' }}>
          JNVN98: FIFA Arena · Built for the community
        </p>
      </footer>
    </div>
  );
}
