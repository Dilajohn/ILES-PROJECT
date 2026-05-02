import { createContext, useCallback, useContext, useState } from 'react';
import { authService } from '../api/authService.js';

const AuthContext = createContext(null);
const SESSION_USER_KEY = 'iles_session_user';

function getSessionUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function normalizeSessionUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.full_name || user.fullName || user.name,
    email: user.email,
    role: user.role,
  };
}

function extractErrorMessage(error, fallback) {
  const payload = error?.response?.data;
  if (typeof payload?.detail === 'string') return payload.detail;
  if (payload && typeof payload === 'object') {
    const first = Object.values(payload)[0];
    if (Array.isArray(first) && first[0]) return first[0];
    if (typeof first === 'string') return first;
  }
  return error?.message || fallback;
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => getSessionUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser);
    if (nextUser) localStorage.setItem(SESSION_USER_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(SESSION_USER_KEY);
  }, []);

  const signup = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.signup(payload);
      const sessionUser = normalizeSessionUser(data.user);
      setUser(sessionUser);
      return { ...data, user: sessionUser };
    } catch (error) {
      const message = extractErrorMessage(error, 'Could not create account.');
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login({ email, password });
      const sessionUser = normalizeSessionUser(data.user);
      setUser(sessionUser);
      return { ...data, user: sessionUser };
    } catch (error) {
      const message = extractErrorMessage(error, 'Incorrect email or password.');
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
