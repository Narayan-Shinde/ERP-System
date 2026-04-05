import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { login as loginAPI } from '../services/api';

const AuthContext = createContext(null);

// ─── Token madhe expiry check ──────────────────────────────
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // milliseconds
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  // 5 minute buffer — 5 min adhi refresh attempt karate
  return Date.now() > expiry - 5 * 60 * 1000;
}

// ─── AuthProvider ──────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // ── Startup: localStorage madhun user load kara ──
  useEffect(() => {
    const storedUser  = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      // Token expired aahe ka check karo
      if (isTokenExpired(storedToken)) {
        // Token expired — clear and require login (expiry comes from backend app.jwt.expiration)
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } else {
        // Token valid aahe — user set karo (server restart hola tari)
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.clear();
          setUser(null);
        }
      }
    }
    setLoading(false);
  }, []);

  // ── Login ──────────────────────────────────────────────
  const login = async (username, password) => {
    const res = await loginAPI({ username, password });
    const { token, ...userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('loginTime', Date.now().toString());
    setUser(userData);
    return userData;
  };

  // ── Logout ─────────────────────────────────────────────
  const logout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    setUser(null);
  }, []);

  // ── Role helpers ───────────────────────────────────────
  const hasRole  = (role) => user?.roles?.includes(role);
  const isAdmin  = ()     => hasRole('ROLE_ADMIN');

  // ── API 401 global handler ─────────────────────────────
  // Jar server restart nanter kahi API call madhe 401 ala tar relogin prompt
  useEffect(() => {
    const handleUnauthorized = (e) => {
      if (e.detail?.status === 401) {
        // Token aahe pan server la validate nahi jhat — session issue
        // Simply reload — localStorage madhe token aahe, auto login hote
        const token = localStorage.getItem('token');
        if (token && !isTokenExpired(token)) {
          // Token valid aahe — fakt page refresh karo
          window.location.reload();
        } else {
          logout();
        }
      }
    };
    window.addEventListener('api-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('api-unauthorized', handleUnauthorized);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
