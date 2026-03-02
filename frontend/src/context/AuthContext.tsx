"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

type User = {
  id: string;
  email: string;
  role: string;
  org_id?: string | null;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  register: (payload: any) => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const r = await api<{ ok: true; user: User }>("/auth/me");
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const register = async (payload: any) => {
    await api("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    await refresh();
  };

  const login = async (payload: { email: string; password: string }) => {
    await api("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    await refresh();
  };

  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    await refresh();
  };

  return (
    <Ctx.Provider value={{ user, loading, register, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}