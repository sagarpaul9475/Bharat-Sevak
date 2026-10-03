import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bs_token');
    const saved = localStorage.getItem('bs_user');
    if (token && saved) {
      setUser(JSON.parse(saved));
      // Refresh user from server
      authAPI.me().then(res => {
        setUser(res.data);
        localStorage.setItem('bs_user', JSON.stringify(res.data));
      }).catch(() => {
        logout();
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('bs_token', res.data.token);
    localStorage.setItem('bs_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    localStorage.setItem('bs_token', res.data.token);
    localStorage.setItem('bs_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('bs_token');
    localStorage.removeItem('bs_user');
    setUser(null);
  };

  const switchRole = async () => {
    const res = await authAPI.switchRole();
    const updated = { ...user, activeRole: res.data.activeRole };
    setUser(updated);
    localStorage.setItem('bs_user', JSON.stringify(updated));
    return updated;
  };

  const isAdmin = user?.role === 'admin';
  const isProvider = user?.role === 'provider';
  const isCustomer = user?.role === 'customer';
  const effectiveRole = user?.role === 'provider' ? (user?.activeRole || 'provider') : user?.role;

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchRole, isAdmin, isProvider, isCustomer, effectiveRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
