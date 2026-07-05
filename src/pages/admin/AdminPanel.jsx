import { useState } from 'react';
import ManageMatches from './ManageMatches';
import ManageResults from './ManageResults';
import ImportMatch from './ImportMatch';
import ManageUsers from './ManageUsers';
import QuickAdd from './QuickAdd';
import ManageGroups from './ManageGroups';
import ManagePolls from './ManagePolls';
import ManageHouses from './ManageHouses';
import UserPollResults from './UserPollResults';
import AwardStats from './AwardStats';

const TABS = ['Matches', 'Results', 'Import', 'Users', 'Groups', 'Houses', 'Polls', 'Schedule', 'Poll Results', 'Awards'];

export default function AdminPanel() {
  const [tab, setTab] = useState('Matches');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">⚙️</span>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--c-t1)' }}>Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-2 mb-6 pb-3 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--c-border)' }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={
              tab === t
                ? { background: 'var(--c-gold)', color: '#0F172A' }
                : { color: 'var(--c-t2)', background: 'transparent' }
            }
            onMouseEnter={(e) => {
              if (tab !== t) e.currentTarget.style.background = 'var(--c-surface)';
            }}
            onMouseLeave={(e) => {
              if (tab !== t) e.currentTarget.style.background = 'transparent';
            }}
          >
            {t === 'Import' ? '📥 Import' : t === 'Schedule' ? '📅 Schedule' : t === 'Groups' ? '👥 Groups' : t === 'Polls' ? '📊 Polls' : t === 'Houses' ? '🏠 Houses' : t === 'Poll Results' ? '📋 Poll Results' : t === 'Awards' ? '🏅 Awards' : t}
          </button>
        ))}
      </div>

      {tab === 'Matches'  && <ManageMatches />}
      {tab === 'Results'  && <ManageResults />}
      {tab === 'Import'   && <ImportMatch />}
      {tab === 'Users'    && <ManageUsers />}
      {tab === 'Groups'   && <ManageGroups />}
      {tab === 'Houses'   && <ManageHouses />}
      {tab === 'Polls'    && <ManagePolls />}
      {tab === 'Schedule'     && <QuickAdd />}
      {tab === 'Poll Results' && <UserPollResults />}
      {tab === 'Awards'      && <AwardStats />}
    </div>
  );
}
