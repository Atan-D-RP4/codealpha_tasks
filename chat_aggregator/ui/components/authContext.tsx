"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// UI-side user type that covers both sanitized user from /login and profile from /me
export type UIUser = {
  id: number;
  username: string;
  email?: string;
  role?: "user" | "admin" | "guest";
  created_at?: string;
  // profile fields
  display_name?: string;
  bio?: string;
  avatar_url?: string;
};

interface AuthContextType {
  user: UIUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UIUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/me", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUser(result.data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Login failed");
    }

    setUser(result.data.user);
    // immediately hydrate richer profile if available
    try { await fetchUser(); } catch (_) {}
  };

  const register = async (
    username: string,
    email: string,
    password: string,
  ) => {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
      credentials: "include",
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Registration failed");
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" ,
      credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
