import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('voxpro_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('voxpro_token');
    if (!token) {
      setLoading(false);
      return;
    }
    client
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.data);
        localStorage.setItem('voxpro_user', JSON.stringify(res.data.data));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('voxpro_token');
        localStorage.removeItem('voxpro_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await client.post('/auth/login', { username, password });
    const { token, user: userData } = res.data.data;
    localStorage.setItem('voxpro_token', token);
    localStorage.setItem('voxpro_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('voxpro_token');
    localStorage.removeItem('voxpro_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
