"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Container from "@/components/layout/Container.tsx";
import { useAuth } from "@/components/authContext.tsx";
import Button from "@/components/ui/Button.tsx";
import Alert from "@/components/ui/Alert.tsx";
import Badge from "@/components/ui/Badge.tsx";
import { Card } from "@/components/ui/Card.tsx";

interface Message {
  id: number;
  chat_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface ChatWithMessages {
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
  messages: Message[];
}

const platformInfo = {
  chatgpt: { emoji: "🤖", name: "ChatGPT", color: "green" as const },
  claude: { emoji: "🔮", name: "Claude", color: "purple" as const },
  grok: { emoji: "⚡", name: "Grok", color: "blue" as const },
  gemini: { emoji: "💎", name: "Gemini", color: "yellow" as const },
  other: { emoji: "💬", name: "Other", color: "gray" as const },
};

export default function ChatDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [chat, setChat] = useState<ChatWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chatId = params.id as string;

  useEffect(() => {
    if (user && chatId) {
      loadChat();
    }
  }, [user, chatId]);

  const loadChat = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chats/${chatId}`, {
        credentials: "include",
      });
      const result = await response.json();

      if (result.success) {
        setChat(result.data);
      } else {
        setError(result.error || "Chat not found");
      }
    } catch (err) {
      setError("Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) {
    return (
      <div className="py-8">
        <Container>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Chat Details
            </h1>
            <p className="text-muted-foreground mb-6">
              Please log in to view chat details.
            </p>
            <Button onClick={() => window.location.href = "/login"}>
              Log In
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-8">
        <Container>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="ml-4 text-muted-foreground">Loading chat...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="py-8">
        <Container>
          <Alert type="error" className="mb-6">
            {error || "Chat not found"}
          </Alert>
          <Button onClick={() => window.history.back()}>
            ← Go Back
          </Button>
        </Container>
      </div>
    );
  }

  const platform = platformInfo[chat.platform];

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{platform.emoji}</span>
                <h1 className="text-3xl font-bold text-foreground">
                  {chat.title}
                </h1>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <Badge color={platform.color}>
                  {platform.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {chat.message_count} messages
                </span>
                <span className="text-sm text-muted-foreground">
                  Created {formatDate(chat.created_at)}
                </span>
              </div>

              {chat.tags && chat.tags.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {chat.tags.map((tag) => (
                    <Badge key={tag} color="gray" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {chat.url && (
                <a
                  href={chat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 text-sm"
                >
                  <Button variant="secondary">
                    View Original ↗
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {chat.messages.length === 0 ? (
            <Card className="text-center py-8">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Messages
              </h3>
              <p className="text-muted-foreground">
                This chat doesn't have any messages yet.
              </p>
            </Card>
          ) : (
            chat.messages.map((message) => (
              <Card
                key={message.id}
                className={`${
                  message.role === "user"
                    ? "ml-8 bg-blue-900 border-blue-700"
                    : message.role === "assistant"
                    ? "mr-8 bg-secondary"
                    : "bg-yellow-900 border-yellow-700"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">
                      {message.role === "user" ? "You" : 
                       message.role === "assistant" ? platform.name : 
                       "System"}
                    </span>
                    {message.role === "user" && <span>👤</span>}
                    {message.role === "assistant" && <span>{platform.emoji}</span>}
                    {message.role === "system" && <span>⚙️</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageTime(message.timestamp)}
                  </span>
                </div>
                
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-foreground">
                    {message.content}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Container>
    </div>
  );
}