import { createContext, useContext, useEffect, useState } from 'react';
import { getHouses } from '../firebase/services';

const HouseContext = createContext({});

export function HouseProvider({ children }) {
  const [houseColorMap, setHouseColorMap] = useState({});

  useEffect(() => {
    getHouses().then((houses) => {
      const map = {};
      houses.forEach((h) => { map[h.id] = h.color; });
      setHouseColorMap(map);
    });
  }, []);

  return (
    <HouseContext.Provider value={{ houseColorMap }}>
      {children}
    </HouseContext.Provider>
  );
}

export function useHouses() {
  return useContext(HouseContext);
}
