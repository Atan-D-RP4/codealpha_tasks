"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/components/authContext.tsx";
import Container from "./Container.tsx";

export default function Header() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      globalThis.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-black/10 shadow-lg sticky top-0 z-50">
      <Container className="flex justify-between items-center py-4">
        {/* @ts-ignore */}
        <Link
          href="/"
          className="text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors"
        >
          💬 Mini Social
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {/* @ts-ignore */}
          <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
            Feed
          </Link>
          {/* @ts-ignore */}
          <Link href="/profile" className="text-gray-700 hover:text-blue-600">
            Profile
          </Link>
          {/* @ts-ignore */}
          <Link href="/search" className="text-gray-700 hover:text-blue-600">
            Search
          </Link>
        </nav>

        {user ? (
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="font-semibold text-gray-800">{user.username}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white border-none rounded-lg cursor-pointer font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/30"
            >
              Logout
            </button>
          </div>
        ) : (
          <div>
            {/* @ts-ignore */}
            <Link href="/login" className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Sign in</Link>
          </div>
        )}
      </Container>
    </header>
  );
}
