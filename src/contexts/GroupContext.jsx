import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getGroups, getUser } from '../firebase/services';

const GroupContext = createContext(null);

export function GroupProvider({ children }) {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [activeGroupId, setActiveGroupIdState] = useState(
    () => localStorage.getItem('activeGroupId') || null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMyGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getGroups(), getUser(user.uid)]).then(([groups, me]) => {
      setMyProfile(me || null);
      const memberOf = new Set(me?.groupIds || []);
      const mine = groups.filter(
        (g) => memberOf.has(g.id) || (g.adminIds || []).includes(user.uid)
      );
      setMyGroups(mine);

      // Auto-select if only one group
      if (mine.length === 1) {
        const id = mine[0].id;
        setActiveGroupIdState(id);
        localStorage.setItem('activeGroupId', id);
      }

      // Clear stored group if user is no longer in it
      setActiveGroupIdState((prev) => {
        if (prev && !mine.find((g) => g.id === prev)) {
          localStorage.removeItem('activeGroupId');
          return null;
        }
        return prev;
      });

      setLoading(false);
    });
  }, [user?.uid]);

  function setActiveGroupId(id) {
    setActiveGroupIdState(id);
    if (id) localStorage.setItem('activeGroupId', id);
    else localStorage.removeItem('activeGroupId');
  }

  const activeGroup = myGroups.find((g) => g.id === activeGroupId) || null;

  return (
    <GroupContext.Provider value={{ myGroups, myProfile, activeGroup, activeGroupId, setActiveGroupId, loading }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
