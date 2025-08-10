// =============================================================================
// SOCIAL MEDIA SERVICE
// =============================================================================

import { DatabaseAdapter } from "./db.ts";
import {
  Comment,
  CreateCommentRequest,
  CreatePostRequest,
  Post,
  UpdatePostRequest,
  UpdateProfileRequest,
  UserProfile,
} from "./schema.ts";

export class SocialMediaService {
  constructor(private db: DatabaseAdapter) {}

  // Profile methods
  async updateProfile(
    userId: number,
    data: UpdateProfileRequest,
  ): Promise<{ user: UserProfile }> {
    const updatedUser = await this.db.updateUserProfile(
      userId,
      data.bio,
      data.avatar_url,
      data.display_name,
    );

    if (!updatedUser) {
      throw new Error("Failed to update profile");
    }

    const profile = await this.db.getUserProfile(userId, userId);
    if (!profile) {
      throw new Error("Failed to retrieve updated profile");
    }

    return { user: profile };
  }

  async getUserProfile(
    userId: number,
    currentUserId?: number,
  ): Promise<UserProfile | null> {
    return await this.db.getUserProfile(userId, currentUserId);
  }

  // Post methods
  async createPost(
    userId: number,
    data: CreatePostRequest,
  ): Promise<{ post: Post }> {
    const post = await this.db.createPost(userId, data.content, data.image_url);
    return { post };
  }

  async getPost(postId: number, currentUserId?: number): Promise<Post | null> {
    return await this.db.getPost(postId, currentUserId);
  }

  async updatePost(
    postId: number,
    userId: number,
    data: UpdatePostRequest,
  ): Promise<Post | null> {
    return await this.db.updatePost(
      postId,
      userId,
      data.content,
      data.image_url,
    );
  }

  async deletePost(postId: number, userId: number): Promise<boolean> {
    return await this.db.deletePost(postId, userId);
  }

  async getPosts(
    limit = 20,
    offset = 0,
    currentUserId?: number,
  ): Promise<{ posts: Post[] }> {
    const posts = await this.db.getPosts(limit, offset, currentUserId);
    return { posts };
  }

  async getUserPosts(
    userId: number,
    limit = 20,
    offset = 0,
    currentUserId?: number,
  ): Promise<{ posts: Post[] }> {
    const posts = await this.db.getUserPosts(
      userId,
      limit,
      offset,
      currentUserId,
    );
    return { posts };
  }

  async getFeed(
    userId: number,
    limit = 20,
    offset = 0,
  ): Promise<{ posts: Post[] }> {
    const posts = await this.db.getFollowingPosts(userId, limit, offset);
    return { posts };
  }

  // Comment methods
  async createComment(
    userId: number,
    postId: number,
    data: CreateCommentRequest,
  ): Promise<{ comment: Comment }> {
    // Check if post exists
    const post = await this.db.getPost(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const comment = await this.db.createComment(userId, postId, data.content);
    return { comment };
  }

  async getPostComments(
    postId: number,
    limit = 50,
    offset = 0,
    currentUserId?: number,
  ): Promise<{ comments: Comment[] }> {
    const comments = await this.db.getPostComments(
      postId,
      limit,
      offset,
      currentUserId,
    );
    return { comments };
  }

  async updateComment(
    commentId: number,
    userId: number,
    content: string,
  ): Promise<Comment | null> {
    return await this.db.updateComment(commentId, userId, content);
  }

  async deleteComment(commentId: number, userId: number): Promise<boolean> {
    return await this.db.deleteComment(commentId, userId);
  }

  // Like methods
  async togglePostLike(
    userId: number,
    postId: number,
  ): Promise<{ liked: boolean }> {
    // Check if post exists
    const post = await this.db.getPost(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const isLiked = await this.db.isPostLiked(userId, postId);

    if (isLiked) {
      await this.db.unlikePost(userId, postId);
      return { liked: false };
    } else {
      await this.db.likePost(userId, postId);
      return { liked: true };
    }
  }

  async toggleCommentLike(
    userId: number,
    commentId: number,
  ): Promise<{ liked: boolean }> {
    const isLiked = await this.db.isCommentLiked(userId, commentId);

    if (isLiked) {
      await this.db.unlikeComment(userId, commentId);
      return { liked: false };
    } else {
      await this.db.likeComment(userId, commentId);
      return { liked: true };
    }
  }

  // Follow methods
  async toggleFollow(
    followerId: number,
    followingId: number,
  ): Promise<{ following: boolean }> {
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    // Check if target user exists
    const targetUser = await this.db.getUserById(followingId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const isFollowing = await this.db.isFollowing(followerId, followingId);

    if (isFollowing) {
      await this.db.unfollowUser(followerId, followingId);
      return { following: false };
    } else {
      await this.db.followUser(followerId, followingId);
      return { following: true };
    }
  }

  async getFollowers(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<{ users: UserProfile[] }> {
    const users = await this.db.getFollowers(userId, limit, offset);
    return { users };
  }

  async getFollowing(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<{ users: UserProfile[] }> {
    const users = await this.db.getFollowing(userId, limit, offset);
    return { users };
  }

  // Search methods (basic implementation)
  async searchUsers(
    query: string,
  ): Promise<{ users: UserProfile[] }> {
    // This is a simple implementation - in production you'd want full-text search
    const userProfiles = await this.db.searchUsers(query);

    return { users: userProfiles };
  }

  // Search posts by content or hashtags
  // Note: This is a basic search implementation. For production, consider using full-text search.
  async searchPosts(
    query: string,
    limit = 20,
    currentUserId?: number,
  ): Promise<{ posts: Post[] }> {
    const posts = await this.db.searchPosts(query, limit, currentUserId);
    return { posts };
  }
}
