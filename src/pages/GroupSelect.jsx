import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';

export default function GroupSelect() {
  const { user } = useAuth();
  const { myGroups, activeGroupId, setActiveGroupId } = useGroup();
  const navigate = useNavigate();
  const location = useLocation();
  const isSwitching = !!location.state?.switching;

  function handleSelect(groupId) {
    setActiveGroupId(groupId);
    navigate('/');
  }

  // No groups → waiting screen
  if (myGroups.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 animate-fade-in"
        style={{ background: 'var(--c-page)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto"
            style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)' }}>
            ⚽
          </div>
          <h1 className="text-[20px] font-bold" style={{ color: 'var(--c-t1)' }}>You're not in a group yet</h1>
          <p className="text-[13px]" style={{ color: 'var(--c-t2)' }}>
            Ask your group admin to add you. Once added, you'll be able to enter and see your community's leaderboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 animate-fade-in"
      style={{ background: 'var(--c-page)' }}>
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto"
            style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)' }}>
            ⚽
          </div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--c-t1)' }}>
            {isSwitching ? 'Switch Group' : 'Choose Your Group'}
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--c-t2)' }}>
            Select the community you want to enter
          </p>
        </div>

        {/* Group cards */}
        <div className="space-y-3">
          {myGroups.map((group) => {
            const isAdmin = (group.adminIds || []).includes(user?.uid);
            const isActive = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                onClick={() => handleSelect(group.id)}
                className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all"
                style={{
                  background: isActive ? 'var(--c-primary-bg)' : 'var(--c-card)',
                  border: `2px solid ${isActive ? 'var(--c-primary)' : 'var(--c-border)'}`,
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)', color: '#fff' }}>
                  {group.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--c-t1)' }}>
                    {group.name}
                  </div>
                  {isAdmin && (
                    <div className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--c-gold)' }}>
                      Group Admin
                    </div>
                  )}
                </div>
                {isActive && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--c-primary)', color: '#fff' }}>
                    Active
                  </span>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ color: 'var(--c-t3)', flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            );
          })}
        </div>

        {isSwitching && (
          <button onClick={() => navigate(-1)}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium"
            style={{ color: 'var(--c-t3)', border: '1px solid var(--c-border)' }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
