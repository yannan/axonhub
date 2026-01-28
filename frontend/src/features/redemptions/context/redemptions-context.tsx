'use client';

import React, { createContext, useContext, useState } from 'react';

interface RedemptionsContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const RedemptionsContext = createContext<RedemptionsContextType | undefined>(undefined);

export function useRedemptionsContext() {
  const context = useContext(RedemptionsContext);
  if (!context) {
    throw new Error('useRedemptionsContext must be used within a RedemptionsProvider');
  }
  return context;
}

interface RedemptionsProviderProps {
  children: React.ReactNode;
}

export default function RedemptionsProvider({ children }: RedemptionsProviderProps) {
  const [isLoading, setIsLoading] = useState(false);

  const value: RedemptionsContextType = {
    isLoading,
    setIsLoading,
  };

  return <RedemptionsContext.Provider value={value}>{children}</RedemptionsContext.Provider>;
}
