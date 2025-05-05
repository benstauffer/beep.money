'use client'

import { createContext, useState, useContext, ReactNode } from 'react';

type AccountsContextType = {
  refreshTrigger: number;
  refreshAccounts: () => void;
};

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountsProvider');
  }
  return context;
}

interface AccountsProviderProps {
  children: ReactNode;
}

export function AccountsProvider({ children }: AccountsProviderProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshAccounts = () => {
    console.log('Triggering accounts refresh');
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <AccountsContext.Provider value={{ refreshTrigger, refreshAccounts }}>
      {children}
    </AccountsContext.Provider>
  );
} 