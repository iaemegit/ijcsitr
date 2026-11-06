"use client";
import { createContext, useContext, useEffect, useState } from "react";
import adminApi from "../services/adminApi";
import type { AdminSession } from "../types/api";
interface AdminContextValue {
  session: AdminSession | null;
  loading: boolean;
  error: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AdminContext = createContext<AdminContextValue | null>(null);
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    adminApi("/session")
      .then((data) => {
        if (active) setSession(data);
      })
      .catch((error) => {
        if (active && error.status !== 401) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const expire = () => setSession(null);
    window.addEventListener("admin-session-expired", expire);
    return () => {
      active = false;
      window.removeEventListener("admin-session-expired", expire);
    };
  }, []);
  async function login(username, password) {
    const data = await adminApi("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setError("");
    setSession(data);
  }
  async function logout() {
    try {
      await adminApi("/logout", {
        method: "POST",
        csrfToken: session?.csrfToken,
      });
      setSession(null);
    } catch (error) {
      if (error.status === 401) setSession(null);
      else throw error;
    }
  }
  return (
    <AdminContext.Provider value={{ session, loading, error, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}
export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("AdminProvider is required.");
  return value;
}
