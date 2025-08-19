// =============================================================================
// TYPES AND SCHEMAS
// =============================================================================

import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  email: z.email(),
});

export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  role: "user" | "admin" | "guest";
  bio?: string;
  avatar_url?: string;
  display_name?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

export interface Session {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}

export const CreateChatSchema = z.object({
  title: z.string().min(1).max(200),
  platform: z.enum(["chatgpt", "claude", "grok", "gemini", "other"]),
  platform_chat_id: z.string().min(1).max(100),
  url: z.url().optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const CreateMessageSchema = z.object({
  chat_id: z.number().int().positive(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  timestamp: z.date().optional(), // ISO 8601 format
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdateChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  tags: z.array(z.string()).max(10).optional(),
  is_favorite: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

export type CreateChatRequest = z.infer<typeof CreateChatSchema>;
export type CreateMessageRequest = z.infer<typeof CreateMessageSchema>;
export type UpdateChatRequest = z.infer<typeof UpdateChatSchema>;

export interface Chat {
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

export interface Message {
  id: number;
  chat_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date; // ISO 8601 format
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatWithMessages extends Chat {
  messages: Message[];
}

// Source interface for scrapers
export interface ChatSource {
  name: string;
  platform: Chat["platform"];
  close(): Promise<void>;
  isAvailable(): Promise<boolean>;
  getChats(): Promise<Chat[]>;
  getMessages(
    chatId: string,
  ): Promise<Message[]>;
}

export interface PlatformAccount {
  id: number;
  user_id: number;
  platform: Chat["platform"];
  account_name: string; // User-provided label, e.g., "Personal ChatGPT" or "Work Claude"
  cookies: { name: string; value: string; domain?: string; path?: string }[]; // Or storage_state: any for Playwright state
  created_at: string;
}
