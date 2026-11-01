import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile;
  isLoggedIn: boolean;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  login: (email: string, name?: string) => void;
  logout: () => void;
  updateProfile: (updated: Partial<UserProfile>) => void;
  incrementStats: (type: 'chats' | 'images' | 'vision') => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'user_001',
  name: 'Stock Nanzz',
  username: 'stocknanzz',
  email: 'stocknanzz@nexera.ai',
  avatar: '/app-icon.png',
  role: 'Limitless Sorcerer & Ninja',
  bio: 'Pengguna setia NEXERA AI. Penggemar Jujutsu Kaisen & Naruto.',
  membershipTier: 'VIP Pro',
  joinDate: 'Oktober 2024',
  stats: {
    chatsCount: 38,
    imagesCount: 24,
    visionCount: 16,
    tokensUsed: '142.8K',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('nexera_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse local user:', e);
    }
    return DEFAULT_USER;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('nexera_logged_in') !== 'false';
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('nexera_user', JSON.stringify(user));
      localStorage.setItem('nexera_logged_in', isLoggedIn ? 'true' : 'false');
    } catch (e) {
      // storage unavailable
    }
  }, [user, isLoggedIn]);

  const login = (email: string, name?: string) => {
    const extractedName = name || email.split('@')[0] || 'Pengguna NEXERA';
    setUser((prev) => ({
      ...prev,
      email,
      name: extractedName,
      username: extractedName.toLowerCase().replace(/\s+/g, '_'),
    }));
    setIsLoggedIn(true);
    setLoginModalOpen(false);
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setUser((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  const incrementStats = (type: 'chats' | 'images' | 'vision') => {
    setUser((prev) => {
      const newStats = { ...prev.stats };
      if (type === 'chats') newStats.chatsCount += 1;
      if (type === 'images') newStats.imagesCount += 1;
      if (type === 'vision') newStats.visionCount += 1;
      return {
        ...prev,
        stats: newStats,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        loginModalOpen,
        setLoginModalOpen,
        login,
        logout,
        updateProfile,
        incrementStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
