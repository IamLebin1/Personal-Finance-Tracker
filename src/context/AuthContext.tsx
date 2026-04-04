import React, { createContext, useContext, useState } from 'react';

type AuthContextValue = {
  isLoggedIn: boolean;
  userName: string;
  login: (nextUserName?: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');

  const value: AuthContextValue = {
    isLoggedIn,
    userName,
    login: (nextUserName?: string) => {
      setIsLoggedIn(true);
      setUserName(nextUserName || 'User');
    },
    signOut: () => {
      setIsLoggedIn(false);
      setUserName('');
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