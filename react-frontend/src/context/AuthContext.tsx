import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get user from localStorage
  const getStoredUser = useCallback(() => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const user = getStoredUser();
    if (user && user.id) {
      try {
        const userData = await api.getUser();
        setUsername(userData.username);
        setIsAuthenticated(true);
      } catch {
        // User exists in localStorage but API fails - still authenticated
        setUsername(user.username || null);
        setIsAuthenticated(true);
      }
    } else {
      setIsAuthenticated(false);
      setUsername(null);
    }
    setLoading(false);
  }, [getStoredUser]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.login(username, password);
      
      // Store user info in localStorage
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        setUsername(response.user.username);
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      await api.register(username, password);
      // Registration successful, but user still needs to login
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error: any) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API fails
    } finally {
      // Always clear local storage and auth state
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUsername(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        login,
        register,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
