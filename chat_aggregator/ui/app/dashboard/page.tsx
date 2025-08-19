"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/layout/Container.tsx";
import { useAuth } from "@/components/authContext.tsx";
import Button from "@/components/ui/Button.tsx";
import Input from "@/components/ui/Input.tsx";
import Alert from "@/components/ui/Alert.tsx";
import Badge from "@/components/ui/Badge.tsx";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card.tsx";

interface Chat {
  id: number;
  title: string;
  platform: "chatgpt" | "claude" | "grok" | "gemini" | "other";
  platform_chat_id: string;
  url?: string;
  tags?: string[];
  is_favorite: boolean;
  is_archived: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface Stats {
  totalChats: number;
  totalMessages: number;
  platformBreakdown: Record<string, number>;
  favoriteCount: number;
}

const platformColors = {
  chatgpt: "green",
  claude: "purple",
  grok: "blue",
  gemini: "yellow",
  other: "gray",
} as const;

const platformEmojis = {
  chatgpt: "🤖",
  claude: "🔮",
  grok: "⚡",
  gemini: "💎",
  other: "💬",
} as const;

export default function ChatDashboard() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadChats();
    loadStats();
  }, [selectedPlatform, showFavorites]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPlatform !== "all") params.set("platform", selectedPlatform);
      if (showFavorites) params.set("is_favorite", "true");
      params.set("limit", "50");

      const response = await fetch(`/api/chats?${params}`);
      const result = await response.json();

      if (result.success) {
        setChats(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/chats/stats/overview");
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadChats();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/chats/search/${encodeURIComponent(searchQuery)}`,
      );
      const result = await response.json();

      if (result.success) {
        setChats(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/chats/sync", { method: "POST" });
      const result = await response.json();

      if (result.success) {
        await loadChats();
        await loadStats();
        setError(null);
      } else {
        setError("Sync failed");
      }
    } catch (err) {
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const toggleFavorite = async (chat: Chat) => {
    try {
      const response = await fetch(`/api/chats/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !chat.is_favorite }),
      });

      if (response.ok) {
        setChats(
          chats.map((c) =>
            c.id === chat.id ? { ...c, is_favorite: !c.is_favorite } : c
          ),
        );
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="py-8">
      <Container>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Chat Aggregator
            </h1>
            <p className="text-gray-600 mt-1">
              View and manage your AI conversations
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="success">
            {syncing ? "Syncing..." : "🔄 Sync Sources"}
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Chats
                </CardTitle>
                <div className="text-2xl font-bold">{stats.totalChats}</div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Messages
                </CardTitle>
                <div className="text-2xl font-bold">{stats.totalMessages}</div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">
                  Favorites
                </CardTitle>
                <div className="text-2xl font-bold">{stats.favoriteCount}</div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">
                  Platforms
                </CardTitle>
                <div className="text-2xl font-bold">
                  {Object.keys(stats.platformBreakdown).length}
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Platforms</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="claude">Claude</option>
              <option value="grok">Grok</option>
              <option value="gemini">Gemini</option>
              <option value="other">Other</option>
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showFavorites}
                onChange={(e) => setShowFavorites(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Favorites only</span>
            </label>
            <Button onClick={handleSearch} variant="secondary">
              Search
            </Button>
          </div>
        </div>

        {error && <Alert type="error" className="mb-6">{error}</Alert>}

        {/* Chat List */}
        {loading
          ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto">
              </div>
              <p className="mt-4 text-gray-600">Loading chats...</p>
            </div>
          )
          : chats.length === 0
          ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No chats found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? "Try a different search term"
                  : "Sync your sources to import chats"}
              </p>
              {!searchQuery && (
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? "Syncing..." : "Sync Now"}
                </Button>
              )}
            </div>
          )
          : (
            <div className="grid gap-4">
              {chats.map((chat) => (
                <Card
                  key={chat.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {platformEmojis[chat.platform]}
                        </span>
                        <h3 className="font-semibold text-gray-900 flex-1">
                          {chat.title}
                        </h3>
                        <button
                          onClick={() => toggleFavorite(chat)}
                          className={`text-xl ${
                            chat.is_favorite
                              ? "text-yellow-500"
                              : "text-gray-300 hover:text-yellow-500"
                          }`}
                        >
                          ⭐
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <Badge color={platformColors[chat.platform]}>
                          {chat.platform}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {chat.message_count} messages
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(chat.created_at)}
                        </span>
                      </div>

                      {chat.tags && chat.tags.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {chat.tags.map((tag) => (
                            <Badge key={tag} color="gray" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <a
                          href={`/chats/${chat.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Messages →
                        </a>
                        {chat.url && (
                          <a
                            href={chat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Original ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </Container>
    </div>
  );
}
