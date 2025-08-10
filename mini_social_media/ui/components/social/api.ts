export interface ApiResponse<T> { success: boolean; data?: T; error?: string }

export type Post = {
  id: number;
  user_id: number;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  user?: { id: number; username: string; display_name?: string; avatar_url?: string };
  is_liked?: boolean;
};

export type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  user?: { id: number; username: string; display_name?: string; avatar_url?: string };
  is_liked?: boolean;
};

export type UserProfile = {
  id: number;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following?: boolean;
  is_own_profile?: boolean;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data as T;
}

// Posts
export const getFeed = (params?: { limit?: number; offset?: number }) =>
  apiFetch<{ posts: Post[] }>(`/api/posts?${new URLSearchParams({
    limit: String(params?.limit ?? 20),
    offset: String(params?.offset ?? 0),
  })}`);

export const getMyFeed = (params?: { limit?: number; offset?: number }) =>
  apiFetch<{ posts: Post[] }>(`/api/posts/feed?${new URLSearchParams({
    limit: String(params?.limit ?? 20),
    offset: String(params?.offset ?? 0),
  })}`);

export const createPost = (content: string, image_url?: string) =>
  apiFetch<{ post: Post }>("/api/posts", {
    method: "POST",
    body: JSON.stringify({ content, image_url }),
  });

export const likePost = (postId: number) =>
  apiFetch<{ liked: boolean }>(`/api/posts/${postId}/like`, { method: "POST" });

export const getPost = (postId: number) =>
  apiFetch<{ post: Post }>(`/api/posts/${postId}`);

export const deletePost = (postId: number) =>
  apiFetch<{}>(`/api/posts/${postId}`, { method: "DELETE" });

// Comments
export const getComments = (postId: number, params?: { limit?: number; offset?: number }) =>
  apiFetch<{ comments: Comment[] }>(`/api/posts/${postId}/comments?${new URLSearchParams({
    limit: String(params?.limit ?? 50),
    offset: String(params?.offset ?? 0),
  })}`);

export const createComment = (postId: number, content: string) =>
  apiFetch<{ comment: Comment }>(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

export const likeComment = (commentId: number) =>
  apiFetch<{ liked: boolean }>(`/api/comments/${commentId}/like`, { method: "POST" });

// Profiles
export const getMe = () => apiFetch<UserProfile>("/api/me");
export const updateProfile = (data: Partial<Pick<UserProfile, "bio" | "avatar_url" | "display_name">>) =>
  apiFetch<{ user: UserProfile }>("/api/profile", { method: "PATCH", body: JSON.stringify(data) });

export const getUserProfile = (userId: number) => apiFetch<UserProfile>(`/api/users/${userId}`);
export const getUserPosts = (userId: number, params?: { limit?: number; offset?: number }) =>
  apiFetch<{ posts: Post[] }>(`/api/users/${userId}/posts?${new URLSearchParams({
    limit: String(params?.limit ?? 20),
    offset: String(params?.offset ?? 0),
  })}`);

// Follow
export const toggleFollow = (userId: number) =>
  apiFetch<{ following: boolean }>(`/api/users/${userId}/follow`, { method: "POST" });

export const getFollowers = (userId: number, params?: { limit?: number; offset?: number }) =>
  apiFetch<{ users: UserProfile[] }>(`/api/users/${userId}/followers?${new URLSearchParams({
    limit: String(params?.limit ?? 50),
    offset: String(params?.offset ?? 0),
  })}`);

export const getFollowing = (userId: number, params?: { limit?: number; offset?: number }) =>
  apiFetch<{ users: UserProfile[] }>(`/api/users/${userId}/following?${new URLSearchParams({
    limit: String(params?.limit ?? 50),
    offset: String(params?.offset ?? 0),
  })}`);

// Search
export const searchUsers = (q: string, limit = 20) =>
  apiFetch<{ users: UserProfile[] }>(`/api/search/users?${new URLSearchParams({ q, limit: String(limit) })}`);
export const searchPosts = (q: string, limit = 20) =>
  apiFetch<{ posts: Post[] }>(`/api/search/posts?${new URLSearchParams({ q, limit: String(limit) })}`);
