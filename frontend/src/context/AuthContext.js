import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../utils/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const stored = localStorage.getItem('pn_user');
  const [user, setUser] = useState(stored ? JSON.parse(stored) : null);

  const persist = useCallback((u, token) => {
    localStorage.setItem('pn_token', token);
    localStorage.setItem('pn_user', JSON.stringify(u));
    setUser(u);
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.login(email, password);
    persist(user, token);
    return user;
  }, [persist]);

  const register = useCallback(async (name, email, password, headline) => {
    const { token, user } = await api.register(name, email, password, headline);
    persist(user, token);
    return user;
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem('pn_token');
    localStorage.removeItem('pn_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('pn_user', JSON.stringify(merged));
    setUser(merged);
  }, [user]);

  return (
    <Ctx.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
