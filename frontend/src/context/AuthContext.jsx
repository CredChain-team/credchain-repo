// ─────────────────────────────────────────────────────────────
// CredChain Frontend — global AuthContext
// Single source of truth for the session: the JWT, the decoded user, and
// the active role. On login it (a) persists the token + user to
// localStorage, (b) sets the default Axios Authorization header, and
// (c) updates React state so every consumer re-renders. The axios request
// interceptor in services/api.js also reads the same token key, so calls
// made before this provider mounts still authenticate.
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';

const TOKEN_KEY = 'credchain_token';
const USER_KEY = 'credchain_user';

const AuthContext = createContext(null);

// Best-effort decode of a JWT payload (no verification — that's the server's
// job; we only need the claims to know who/what role we are client-side).
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => readStoredUser());

  // Keep the axios default header in sync with whatever token we booted with.
  if (token && !api.defaults.headers.common.Authorization) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  // Accepts an optional user object; if absent (e.g. the Google callback only
  // hands us a token), it's reconstructed from the JWT claims.
  const login = useCallback((newToken, userObj) => {
    let resolved = userObj || null;
    if (!resolved) {
      const claims = decodeJwt(newToken);
      if (claims) {
        resolved = {
          id: claims.sub,
          role: claims.role,
          credchainId: claims.credchainId,
          email: claims.email,
          name: claims.name,
        };
      }
    }

    localStorage.setItem(TOKEN_KEY, newToken);
    if (resolved) localStorage.setItem(USER_KEY, JSON.stringify(resolved));
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(resolved);
    return resolved;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}

// Map a role to its portal namespace (used by AuthCallback + RBAC redirects).
export const PORTAL_HOME = {
  student: '/student',
  employer: '/employer',
  issuer: '/issuer',
};
