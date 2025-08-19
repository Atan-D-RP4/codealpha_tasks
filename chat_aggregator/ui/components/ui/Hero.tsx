"use client";

import React from "react";
import Container from "../layout/Container.tsx";
import Link from "next/link";
import Button from "./Button.tsx";

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-100 border-b border-black/5 min-h-screen flex items-center">
      <Container className="py-16 grid gap-10 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Centralize Your AI Conversations
          </h1>
          <p className="text-gray-600 mb-6 text-lg">
            Aggregate, search, and manage your chats from ChatGPT, Claude, Grok,
            and other AI platforms in one clean interface.
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard">
              <Button>View Dashboard</Button>
            </Link>
            <Link href="/sources">
              <Button variant="secondary">Configure Sources</Button>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🤖</div>
              <div className="text-sm text-gray-600">ChatGPT</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🔮</div>
              <div className="text-sm text-gray-600">Claude</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">
                🧠
              </div>
              <div className="text-sm text-gray-600">Grok</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🌐</div>
              <div className="text-sm text-gray-600">Gemini</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📂</div>
              <div className="text-sm text-gray-600">Other Sources</div>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <img
            src="/images/hero-illustration.png"
            alt="AI Conversations"
            className="max-w-full h-auto"
          />
        </div>
      </Container>
    </section>
  );
}
