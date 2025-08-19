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

export const CreatePostSchema = z.object({
  content: z.string().min(1).max(1000),
  image_url: z.optional(z.url()),
});

export const UpdatePostSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  image_url: z.optional(z.url()).nullable(),
});

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

export const UpdateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  avatar_url: z.optional(z.url()),
  display_name: z.string().min(1).max(100).optional(),
});

export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type CreatePostRequest = z.infer<typeof CreatePostSchema>;
export type UpdatePostRequest = z.infer<typeof UpdatePostSchema>;
export type CreateCommentRequest = z.infer<typeof CreateCommentSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;

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
