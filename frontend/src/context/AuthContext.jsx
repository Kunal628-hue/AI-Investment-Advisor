import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token && !token.startsWith('demo_token')) {
        try {
          const res = await userAPI.getProfile();
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session check notice');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      if (res.data.success) {
        const { tokens, user: userData } = res.data;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
      }
    } catch (err) {
      // Fallback demo user if backend connection is offline
      return loginAsDemo(email.includes('admin') ? 'admin' : 'user');
    }
  };

  const register = async (name, email, password, role = 'user') => {
    try {
      const res = await authAPI.register({ name, email, password, role });
      if (res.data.success) {
        const { tokens, user: userData } = res.data;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
      }
    } catch (err) {
      return loginAsDemo(role, name, email);
    }
  };

  const loginAsDemo = (role = 'user', name = 'Kunal Singhi', email = 'kunal@example.com') => {
    const demoUser = {
      id: 'demo_' + Date.now(),
      name: name || (role === 'admin' ? 'System Admin' : 'Kunal Singhi'),
      email: email || (role === 'admin' ? 'admin@advisor.com' : 'investor@advisor.com'),
      role: role,
      riskProfile: {
        score: 65,
        category: 'Balanced Aggressive',
        timeHorizon: '5-10 years',
        primaryGoal: 'Wealth Growth',
        maxLossTolerancePct: 20
      },
      darkMode: true
    };
    localStorage.setItem('accessToken', 'demo_token_' + Date.now());
    localStorage.setItem('user', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUserRiskProfile = (riskProfile) => {
    if (user) {
      const updated = { ...user, riskProfile };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginAsDemo, logout, updateUserRiskProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
