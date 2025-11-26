import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '@/constants';

interface User {
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = sessionStorage.getItem('auth_token');
      if (savedToken) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/validate`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.valid) {
              setToken(savedToken);
              setUser({ username: data.username, role: data.role });
            } else {
              sessionStorage.removeItem('auth_token');
            }
          } else {
            sessionStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error('Session validation error:', error);
          sessionStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      setToken(data.token);
      setUser({ username: data.username, role: data.role });
      sessionStorage.setItem('auth_token', data.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      sessionStorage.removeItem('auth_token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
