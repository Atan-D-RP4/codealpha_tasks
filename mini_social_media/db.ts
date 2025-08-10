// =============================================================================
// DATABASE ABSTRACTION
// =============================================================================
import sqlite, { ISqlite, open } from "sqlite";
import sqlite3 from "sqlite3";

import {
  Comment,
  // Follow,
  // Like,
  Post,
  Session,
  User,
  UserProfile,
} from "./schema.ts";

// Minimal transaction wrapper for the `sqlite` + `sqlite3` combo.
class Transaction {
  private active = false;
  constructor(
    private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>,
  ) {}

  get in_transaction(): boolean {
    return this.active;
  }

  async begin(): Promise<void> {
    if (this.active) throw new Error("Transaction already started");
    await this.db.exec("BEGIN IMMEDIATE");
    this.active = true;
  }

  async run(sql: string, params?: any[]): Promise<ISqlite.RunResult> {
    if (!this.active) {
      throw new Error("Cannot run SQL command outside of a transaction");
    }
    return this.db.run(sql, params);
  }

  async get(sql: string, params?: any[]): Promise<any> {
    if (!this.active) {
      throw new Error("Cannot run SQL command outside of a transaction");
    }
    return this.db.get(sql, params);
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    if (!this.active) {
      throw new Error("Cannot run SQL command outside of a transaction");
    }
    return this.db.all(sql, params);
  }

  async commit(): Promise<void> {
    if (!this.active) throw new Error("No transaction to commit");
    console.log("Committing transaction");
    await this.db.exec("COMMIT");
    this.active = false;
  }

  async rollback(): Promise<void> {
    if (!this.active) return;
    await this.db.exec("ROLLBACK");
    this.active = false;
  }
}

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  transaction(): Promise<Transaction>;

  // User methods
  createUser(
    username: string,
    email: string,
    passwordHash: string,
  ): Promise<User>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  updateUserProfile(
    userId: number,
    bio?: string,
    avatarUrl?: string,
    displayName?: string,
  ): Promise<User>;
  getUserProfile(
    userId: number,
    currentUserId?: number,
  ): Promise<UserProfile | null>;

  // Session methods
  createSession(
    userId: number,
    sessionId: string,
    expiresAt: Date,
  ): Promise<void>;
  getSession(sessionId: string): Promise<Session | null>;
  deleteSession(sessionId: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;

  // JWT methods
  isTokenRevoked(jti: string): Promise<boolean>;
  revokeToken(jti: string, expiresAt: Date): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // Post methods
  createPost(userId: number, content: string, imageUrl?: string): Promise<Post>;
  getPost(postId: number, currentUserId?: number): Promise<Post | null>;
  updatePost(
    postId: number,
    userId: number,
    content?: string,
    imageUrl?: string | null,
  ): Promise<Post | null>;
  deletePost(postId: number, userId: number): Promise<boolean>;
  getPosts(
    limit?: number,
    offset?: number,
    currentUserId?: number,
  ): Promise<Post[]>;
  getUserPosts(
    userId: number,
    limit?: number,
    offset?: number,
    currentUserId?: number,
  ): Promise<Post[]>;
  getFollowingPosts(
    userId: number,
    limit?: number,
    offset?: number,
  ): Promise<Post[]>;

  // Comment methods
  createComment(
    userId: number,
    postId: number,
    content: string,
  ): Promise<Comment>;
  getPostComments(
    postId: number,
    limit?: number,
    offset?: number,
    currentUserId?: number,
  ): Promise<Comment[]>;
  updateComment(
    commentId: number,
    userId: number,
    content: string,
  ): Promise<Comment | null>;
  deleteComment(commentId: number, userId: number): Promise<boolean>;

  // Like methods
  likePost(userId: number, postId: number): Promise<void>;
  unlikePost(userId: number, postId: number): Promise<void>;
  likeComment(userId: number, commentId: number): Promise<void>;
  unlikeComment(userId: number, commentId: number): Promise<void>;
  isPostLiked(userId: number, postId: number): Promise<boolean>;
  isCommentLiked(userId: number, commentId: number): Promise<boolean>;

  // Follow methods
  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getFollowers(
    userId: number,
    limit?: number,
    offset?: number,
  ): Promise<UserProfile[]>;
  getFollowing(
    userId: number,
    limit?: number,
    offset?: number,
  ): Promise<UserProfile[]>;
  searchUsers(query: string): Promise<{ users: UserProfile[] }>;
  searchPosts(query: string, currentUserId?: number): Promise<{
    posts: Post[];
  }>;
}

export class SqliteAdapter implements DatabaseAdapter {
  private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>;

  constructor(private dbPath: string = "./social_media.db") {
    this.db = {} as sqlite.Database<sqlite3.Database, sqlite3.Statement>;
  }

  async connect(): Promise<void> {
    this.db = await open({ filename: this.dbPath, driver: sqlite3.Database });

    // Create tables
    await this.createTables();
    await this.createIndexes();

    console.log("Connected to SQLite database:", this.dbPath);
  }

  private async createTables(): Promise<void> {
    // Users table (extended)
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'guest'))
      )
    `);

    // Sessions table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Revoked tokens table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti TEXT PRIMARY KEY,
        revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `);

    // Posts table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Comments table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Likes table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER,
        comment_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE,
        UNIQUE(user_id, post_id),
        UNIQUE(user_id, comment_id),
        CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
      )
    `);

    // Follows table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(follower_id, following_id),
        CHECK (follower_id != following_id)
      )
    `);
  }

  private async createIndexes(): Promise<void> {
    // Existing indexes
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at)`,
    );

    // New indexes for social media features
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON likes(comment_id)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id)`,
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id)`,
    );
  }

  async disconnect(): Promise<void> {
    await this.db.close();
  }

  async transaction(): Promise<Transaction> {
    const tx = new Transaction(this.db);
    await tx.begin();
    return tx;
  }

  // User methods
  async createUser(
    username: string,
    email: string,
    passwordHash: string,
  ): Promise<User> {
    const { lastID } = await this.db.run(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [username, email, passwordHash],
    );
    const user = await this.db.get(`SELECT * FROM users WHERE id = ?`, [
      lastID,
    ]);
    return user as User;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await this.db.get(`SELECT * FROM users WHERE username = ?`, [
      username,
    ]);
    return user || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const user = await this.db.get(`SELECT * FROM users WHERE id = ?`, [id]);
    return user || null;
  }

  async updateUserProfile(
    userId: number,
    bio?: string,
    avatarUrl?: string,
    displayName?: string,
  ): Promise<User> {
    const updates: string[] = [];
    const params: any[] = [];

    if (bio !== undefined) {
      updates.push("bio = ?");
      params.push(bio);
    }
    if (avatarUrl !== undefined) {
      updates.push("avatar_url = ?");
      params.push(avatarUrl);
    }
    if (displayName !== undefined) {
      updates.push("display_name = ?");
      params.push(displayName);
    }

    params.push(userId);

    await this.db.run(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    return (await this.getUserById(userId))!;
  }

  async getUserProfile(
    userId: number,
    currentUserId?: number,
  ): Promise<UserProfile | null> {
    const user = await this.db.get(
      `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.bio,
        u.avatar_url,
        u.created_at,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
      FROM users u
      WHERE u.id = ?
    `,
      [userId],
    );

    if (!user) return null;

    const profile: UserProfile = {
      ...user,
      is_own_profile: currentUserId === userId,
      is_following: false,
    };

    if (currentUserId && currentUserId !== userId) {
      profile.is_following = await this.isFollowing(currentUserId, userId);
    }

    return profile;
  }

  // Session methods
  async createSession(
    userId: number,
    sessionId: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.run(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
      [sessionId, userId, expiresAt.toISOString()],
    );
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.db.get(
      `SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')`,
      [sessionId],
    );
    return session || null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.run(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.db.run(
      `DELETE FROM sessions WHERE expires_at <= datetime('now')`,
    );
  }

  // JWT methods
  async isTokenRevoked(jti: string): Promise<boolean> {
    const row = await this.db.get(
      `SELECT 1 FROM revoked_tokens WHERE jti = ? AND expires_at > datetime('now')`,
      [jti],
    );
    return !!row;
  }

  async revokeToken(jti: string, expiresAt: Date): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)`,
      [jti, expiresAt.toISOString()],
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.db.run(
      "DELETE FROM revoked_tokens WHERE expires_at < ?",
      [new Date().toISOString()],
    );
  }

  // Post methods
  async createPost(
    userId: number,
    content: string,
    imageUrl?: string,
  ): Promise<Post> {
    const { lastID } = await this.db.run(
      `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
      [userId, content, imageUrl || null],
    );

    return (await this.getPost(lastID, userId))!;
  }

  async getPost(postId: number, currentUserId?: number): Promise<Post | null> {
    const post = await this.db.get(
      `
      SELECT
        p.*,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `,
      [postId],
    );

    if (!post) return null;

    const result: Post = {
      id: post.id,
      user_id: post.user_id,
      content: post.content,
      image_url: post.image_url,
      created_at: post.created_at,
      updated_at: post.updated_at,
      likes_count: post.likes_count,
      comments_count: post.comments_count,
      user: {
        id: post.user_id,
        username: post.username,
        display_name: post.display_name,
        avatar_url: post.avatar_url,
      },
    };

    if (currentUserId) {
      result.is_liked = await this.isPostLiked(currentUserId, postId);
    }

    return result;
  }

  async updatePost(
    postId: number,
    userId: number,
    content?: string,
    imageUrl?: string | null,
  ): Promise<Post | null> {
    const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const params: any[] = [];

    if (content !== undefined) {
      updates.push("content = ?");
      params.push(content);
    }
    if (imageUrl !== undefined) {
      updates.push("image_url = ?");
      params.push(imageUrl);
    }

    params.push(postId, userId);

    const result = await this.db.run(
      `UPDATE posts SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      params,
    );

    if (result.changes === 0) return null;
    return await this.getPost(postId, userId);
  }

  async deletePost(postId: number, userId: number): Promise<boolean> {
    const result = await this.db.run(
      `DELETE FROM posts WHERE id = ? AND user_id = ?`,
      [postId, userId],
    );
    return result.changes > 0;
  }

  async getPosts(
    limit = 20,
    offset = 0,
    currentUserId?: number,
  ): Promise<Post[]> {
    const posts = await this.db.all(
      `
      SELECT
        p.*,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [limit, offset],
    );

    return await Promise.all(posts.map(async (post: any) => {
      const result: Post = {
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at,
        updated_at: post.updated_at,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        user: {
          id: post.user_id,
          username: post.username,
          display_name: post.display_name,
          avatar_url: post.avatar_url,
        },
      };

      if (currentUserId) {
        result.is_liked = await this.isPostLiked(currentUserId, post.id);
      }

      return result;
    }));
  }

  async getUserPosts(
    userId: number,
    limit = 20,
    offset = 0,
    currentUserId?: number,
  ): Promise<Post[]> {
    const posts = await this.db.all(
      `
      SELECT
        p.*,
        u.username,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [userId, limit, offset],
    );

    return await Promise.all(posts.map(async (post: any) => {
      const result: Post = {
        id: post.id,
        user_id: userId,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at,
        updated_at: post.updated_at,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        user: {
          id: userId,
          username: post.username,
          display_name: post.display_name,
          avatar_url: post.avatar_url,
        },
      };

      if (currentUserId) {
        result.is_liked = await this.isPostLiked(currentUserId, post.id);
      }

      return result;
    }));
  }

  async getFollowingPosts(
    userId: number,
    limit = 20,
    offset = 0,
  ): Promise<Post[]> {
    const posts = await this.db.all(
      `
      SELECT
        p.*,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN follows f ON p.user_id = f.following_id
      WHERE f.follower_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [userId, limit, offset],
    );

    return await Promise.all(posts.map(async (post: any) => {
      const result: Post = {
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at,
        updated_at: post.updated_at,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        user: {
          id: post.user_id,
          username: post.username,
          display_name: post.display_name,
          avatar_url: post.avatar_url,
        },
      };

      result.is_liked = await this.isPostLiked(userId, post.id);
      return result;
    }));
  }

  // Comment methods
  async createComment(
    userId: number,
    postId: number,
    content: string,
  ): Promise<Comment> {
    const { lastID } = await this.db.run(
      `INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)`,
      [userId, postId, content],
    );

    const comment = await this.db.get(
      `
      SELECT
        c.*,
        u.username,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE comment_id = c.id) as likes_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `,
      [lastID],
    );

    return {
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      likes_count: comment.likes_count,
      user: {
        id: comment.user_id,
        username: comment.username,
        display_name: comment.display_name,
        avatar_url: comment.avatar_url,
      },
    };
  }

  async getPostComments(
    postId: number,
    limit = 50,
    offset = 0,
    currentUserId?: number,
  ): Promise<Comment[]> {
    const comments = await this.db.all(
      `
      SELECT
        c.*,
        u.username,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE comment_id = c.id) as likes_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `,
      [postId, limit, offset],
    );

    return await Promise.all(comments.map(async (comment: any) => {
      const result: Comment = {
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        likes_count: comment.likes_count,
        user: {
          id: comment.user_id,
          username: comment.username,
          display_name: comment.display_name,
          avatar_url: comment.avatar_url,
        },
      };

      if (currentUserId) {
        result.is_liked = await this.isCommentLiked(currentUserId, comment.id);
      }

      return result;
    }));
  }

  async updateComment(
    commentId: number,
    userId: number,
    content: string,
  ): Promise<Comment | null> {
    const result = await this.db.run(
      `UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [content, commentId, userId],
    );

    if (result.changes === 0) return null;

    const comment = await this.db.get(
      `
      SELECT
        c.*,
        u.username,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE comment_id = c.id) as likes_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `,
      [commentId],
    );

    return {
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      likes_count: comment.likes_count,
      user: {
        id: comment.user_id,
        username: comment.username,
        display_name: comment.display_name,
        avatar_url: comment.avatar_url,
      },
    };
  }

  async deleteComment(commentId: number, userId: number): Promise<boolean> {
    const result = await this.db.run(
      `DELETE FROM comments WHERE id = ? AND user_id = ?`,
      [commentId, userId],
    );
    return result.changes > 0;
  }

  // Like methods
  async likePost(userId: number, postId: number): Promise<void> {
    await this.db.run(
      `INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)`,
      [userId, postId],
    );
  }

  async unlikePost(userId: number, postId: number): Promise<void> {
    await this.db.run(
      `DELETE FROM likes WHERE user_id = ? AND post_id = ?`,
      [userId, postId],
    );
  }

  async likeComment(userId: number, commentId: number): Promise<void> {
    await this.db.run(
      `INSERT OR IGNORE INTO likes (user_id, comment_id) VALUES (?, ?)`,
      [userId, commentId],
    );
  }

  async unlikeComment(userId: number, commentId: number): Promise<void> {
    await this.db.run(
      `DELETE FROM likes WHERE user_id = ? AND comment_id = ?`,
      [userId, commentId],
    );
  }

  async isPostLiked(userId: number, postId: number): Promise<boolean> {
    const like = await this.db.get(
      `SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?`,
      [userId, postId],
    );
    return !!like;
  }

  async isCommentLiked(userId: number, commentId: number): Promise<boolean> {
    const like = await this.db.get(
      `SELECT 1 FROM likes WHERE user_id = ? AND comment_id = ?`,
      [userId, commentId],
    );
    return !!like;
  }

  // Follow methods
  async followUser(followerId: number, followingId: number): Promise<void> {
    await this.db.run(
      `INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`,
      [followerId, followingId],
    );
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await this.db.run(
      `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId],
    );
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const follow = await this.db.get(
      `SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId],
    );
    return !!follow;
  }

  async getFollowers(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<UserProfile[]> {
    const followers = await this.db.all(
      `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.bio,
        u.avatar_url,
        u.created_at,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
      FROM users u
      JOIN follows f ON u.id = f.follower_id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [userId, limit, offset],
    );

    return followers.map((user: any) => ({
      ...user,
      is_own_profile: false,
      is_following: false, // These are followers, so current user doesn't follow them by default
    }));
  }

  async getFollowing(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<UserProfile[]> {
    const following = await this.db.all(
      `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.bio,
        u.avatar_url,
        u.created_at,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
      FROM users u
      JOIN follows f ON u.id = f.following_id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [userId, limit, offset],
    );

    return following.map((user: any) => ({
      ...user,
      is_own_profile: false,
      is_following: true, // These are people the user follows
    }));
  }

  // Note: This is a basic search implementation.
  // In a production application, you would likely want to implement full-text search
  // or use a dedicated search engine for better performance and relevance.
  async searchUsers(
    query: string,
    limit = 20,
  ): Promise<{ users: UserProfile[] }> {
    const users = await this.db.all(
      `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.bio,
        u.avatar_url,
        u.created_at,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
      FROM users u
      WHERE u.username LIKE ? OR u.display_name LIKE ? OR u.bio LIKE ?
      ORDER BY u.username
      LIMIT ?
    `,
      [`%${query}%`, `%${query}%`, `%${query}%`, limit],
    );

    const userProfiles = users.map((user: any) => ({
      ...user,
      is_own_profile: false,
      is_following: false, // Default to false, can be updated later
    }));

    return { users: userProfiles };
  }

  // Note: This is a basic search implementation.
  // In a production application, you would likely want to implement full-text search
  async searchPosts(
    query: string,
    limit = 20,
    currentUserId?: number,
  ): Promise<{ posts: Post[] }> {
    const posts = await this.db.all(
      `
      SELECT
        p.*,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.content LIKE ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `,
      [`%${query}%`, limit],
    );

    const postsWithLikes = await Promise.all(posts.map(async (post: any) => {
      const result: Post = {
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at,
        updated_at: post.updated_at,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        user: {
          id: post.user_id,
          username: post.username,
          display_name: post.display_name,
          avatar_url: post.avatar_url,
        },
      };

      if (currentUserId) {
        result.is_liked = await this.isPostLiked(currentUserId, post.id);
      }

      return result;
    }));

    return { posts: postsWithLikes };
  }
}

