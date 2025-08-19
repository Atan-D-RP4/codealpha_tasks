"use client";

import React from "react";
import Container from "../layout/Container.tsx";
import Link from "next/link";
import Button from "./Button.tsx";

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-100 border-b border-black/5">
      <Container className="py-16 grid gap-10 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Share updates, follow friends, and join the conversation
          </h1>
          <p className="text-gray-600 mb-6">
            Template for Next.js UI and Express API.
            Sign in to start posting and interacting.
          </p>
          <div className="flex gap-3">
            <Link href="/login">
              <Button>Get started</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary">View feed</Button>
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="h-64 md:h-80 rounded-3xl bg-white shadow-xl border border-black/5 grid place-items-center text-7xl">
💬
          </div>
          <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-2 border border-black/5 text-sm">
Realtime vibes ✨
          </div>
        </div>
      </Container>
    </section>
  );
}
