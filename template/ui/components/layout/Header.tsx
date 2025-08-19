"use client";

import React from "react";
import Link from "next/link";
import Container from "./Container.tsx";
import { useAuth } from "@/components/authContext.tsx";
import Button from "@/components/ui/Button.tsx";

export default function Header() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-black/10 shadow-lg sticky top-0 z-50">
      <Container className="flex justify-between items-center py-4">
        <Link
          href="/"
          className="text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors"
        >
          🤖 Chat Aggregator
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                Dashboard
              </Link>
              <Link href="/sources" className="text-gray-700 hover:text-blue-600">
                Sources
              </Link>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-gray-600">Hi, {user.username}</span>
                <Button variant="ghost" onClick={handleLogout} className="text-sm">
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link href="/sources" className="text-gray-700 hover:text-blue-600">
                Sources
              </Link>
              <Link href="/login">
                <Button variant="secondary" className="text-sm">
                  Login
                </Button>
              </Link>
            </>
          )}
        </nav>
      </Container>
    </header>
  );
}

