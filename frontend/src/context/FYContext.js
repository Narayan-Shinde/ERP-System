import React, { createContext, useContext, useState } from 'react';

const buildFYList = () => {
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = 2000; y <= currentYear + 1; y++) {
    const label = `${y}-${String(y + 1).slice(2)}`;
    const from  = `${y}-04-01`;
    const to    = `${y + 1}-03-31`;
    years.push({ label, value: label, from, to, startYear: y });
  }
  return years.reverse();
};

export const FY_LIST = buildFYList();

export const ALL_YEARS = { label: 'All Years', value: 'ALL', from: '2000-04-01', to: '2099-03-31', startYear: 0 };

const todayFY = () => {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  return FY_LIST.find(f => f.startYear === startYear) || FY_LIST[0];
};

const FYContext = createContext(null);

export const FYProvider = ({ children }) => {
  const [selectedFY, setSelectedFY] = useState(todayFY());

  return (
    <FYContext.Provider value={{ selectedFY, setSelectedFY, fyList: [ALL_YEARS, ...FY_LIST] }}>
      {children}
    </FYContext.Provider>
  );
};

export const useFY = () => useContext(FYContext);
