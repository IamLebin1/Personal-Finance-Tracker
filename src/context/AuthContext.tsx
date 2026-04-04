import React, { createContext, useContext, useState } from 'react';

type AuthContextValue = {
  isLoggedIn: boolean;
  login: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const value: AuthContextValue = {
    isLoggedIn,
    login: () => {
      setIsLoggedIn(true);
    },
    signOut: () => {
      setIsLoggedIn(false);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};