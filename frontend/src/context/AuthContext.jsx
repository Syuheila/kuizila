import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('loomi_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state and verify with backend
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('loomi_token');
      const storedUser = localStorage.getItem('loomi_user');

      if (storedToken) {
        try {
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
          setToken(storedToken);

          // Verify token against backend /api/auth/me
          const me = await api.getMe();
          if (me && me.id) {
            setUser(me);
            localStorage.setItem('loomi_user', JSON.stringify(me));
          }
        } catch (err) {
          console.warn('Session verification failed, clearing saved token:', err);
          localStorage.removeItem('loomi_token');
          localStorage.removeItem('loomi_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, rememberMe = false) => {
    const res = await api.login({ email, password, remember_me: rememberMe });
    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('loomi_token', res.token);
      localStorage.setItem('loomi_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Invalid login response from server');
  };

  const signup = async (formData) => {
    return await api.register(formData);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    setUser(null);
    setToken(null);
    localStorage.removeItem('loomi_token');
    localStorage.removeItem('loomi_user');
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('loomi_user', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    token,
    loading,
    isAdmin: user?.role === 'admin' || user?.role === 'owner',
    login,
    signup,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
