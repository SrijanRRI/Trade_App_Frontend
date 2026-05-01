import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi, TOKEN_KEY } from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const loadMe = async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.me();
      setUser(res.user);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const login = async (payload, isBootstrap = false) => {
    const res = isBootstrap
      ? await authApi.bootstrap(payload)
      : await authApi.login(payload);

    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission) => {
    const permissions = user?.role?.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      logout,
      hasPermission,
      refreshUser: loadMe
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);