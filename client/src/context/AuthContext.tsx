import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

export type UserRole = "masterAdmin" | "normalUser";
export type SectionKey =
  | "designer"
  | "projects"
  | "simulation"
  | "visualization"
  | "outputRequests"
  | "flexTable"
  | "excelIO"
  | "networkSettings";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  sectionAccess: SectionKey[];
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  updateUser: (userData: AuthUser, newToken?: string) => void;
  hasSection: (section: SectionKey) => boolean;
  isMasterAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "whamo_auth_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((tok: string, userData: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    setUser(userData);
    queryClient.clear();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  const updateUser = useCallback((userData: AuthUser, newToken?: string) => {
    setUser(userData);
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
    }
  }, []);

  const hasSection = useCallback(
    (section: SectionKey) => {
      if (!user) return false;
      if (user.role === "masterAdmin") return true;
      return user.sectionAccess.includes(section);
    },
    [user],
  );

  const isMasterAdmin = useCallback(() => user?.role === "masterAdmin", [user]);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) { setIsLoading(false); return; }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        setToken(stored);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    applyToken(data.token, data.user);
  }, [applyToken]);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, register, updateUser, hasSection, isMasterAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
