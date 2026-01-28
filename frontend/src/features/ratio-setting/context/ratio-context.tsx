'use client';

import React, { createContext, useContext, useState } from 'react';

interface RatioContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const RatioContext = createContext<RatioContextType | undefined>(undefined);

export function useRatioContext() {
  const context = useContext(RatioContext);
  if (!context) {
    throw new Error('useRatioContext must be used within a RatioProvider');
  }
  return context;
}

interface RatioProviderProps {
  children: React.ReactNode;
}

export default function RatioProvider({ children }: RatioProviderProps) {
  const [isLoading, setIsLoading] = useState(false);

  const value: RatioContextType = {
    isLoading,
    setIsLoading,
  };

  return <RatioContext.Provider value={value}>{children}</RatioContext.Provider>;
}
