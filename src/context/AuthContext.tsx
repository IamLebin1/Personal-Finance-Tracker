import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { clearSession } from '../utils/session';

type AuthContextValue = {
  isLoggedIn: boolean;
  currentUserId: string;
  userName: string;
  login: (nextUserId?: string, nextUserName?: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [userName, setUserName] = useState('');

  const login = useCallback((nextUserId?: string, nextUserName?: string) => {
      setIsLoggedIn(true);
      setCurrentUserId(nextUserId || '');
      setUserName(nextUserName || 'User');
    }, []);

  const signOut = useCallback(() => {
      setIsLoggedIn(false);
      setCurrentUserId('');
      setUserName('');
      clearSession();
    }, []);

  const value: AuthContextValue = useMemo(() => {
    return {
      isLoggedIn,
      currentUserId,
      userName,
      login,
      signOut,
    };
  }, [currentUserId, isLoggedIn, login, signOut, userName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};