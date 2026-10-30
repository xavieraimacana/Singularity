import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../services/api-client.js';

export interface UserProfile {
  id: string;
  username: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  updatePassword: (currentPass: string, newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('singularity-auth-expired', handleExpired);
    return () => window.removeEventListener('singularity-auth-expired', handleExpired);
  }, []);

  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await api.get<UserProfile>('/auth/me');
        setUser(profile);
      } catch {
        clearAuthToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadMe();
  }, [token]);

  const login = async (username: string, pass: string) => {
    const res = await api.post<{ token: string; user: UserProfile }>('/auth/login', {
      username,
      password: pass
    });

    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    clearAuthToken();
    setToken(null);
    setUser(null);
  };

  const updatePassword = async (currentPass: string, newPass: string) => {
    if (!user) return;
    await api.post('/auth/change-password', {
      userId: user.id,
      currentPassword: currentPass,
      newPassword: newPass
    });

    setUser({
      ...user,
      mustChangePassword: false
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
