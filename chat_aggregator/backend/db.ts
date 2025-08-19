// =============================================================================
// DATABASE ABSTRACTION
// =============================================================================
import sqlite, { ISqlite, open } from "sqlite";
import sqlite3 from "sqlite3";

import {
  Chat,
  ChatWithMessages,
  Message,
  PlatformAccount,
  Session,
  User,
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

  // Chat methods
  createChat(
    data: Omit<Chat, "id" | "created_at" | "updated_at" | "message_count">,
  ): Promise<Chat>;
  getChatById(id: number): Promise<Chat | null>;
  getChatByPlatformId(
    platform: string,
    platformChatId: string,
  ): Promise<Chat | null>;
  getChats(filters?: {
    platform?: string;
    is_favorite?: boolean;
    is_archived?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Chat[]>;
  updateChat(id: number, updates: Partial<Chat>): Promise<void>;
  deleteChat(id: number): Promise<void>;

  // Message methods
  createMessage(data: Omit<Message, "id" | "created_at">): Promise<Message>;
  getMessagesByChat(chatId: number): Promise<Message[]>;
  getChatWithMessages(chatId: number): Promise<ChatWithMessages | null>;
  deleteMessagesByChat(chatId: number): Promise<void>;

  // Bulk operations
  createChatWithMessages(
    chat: Omit<Chat, "id" | "created_at" | "updated_at" | "message_count">,
    messages: Omit<Message, "id" | "chat_id" | "created_at">[],
    accountId?: number, // Optional account ID for platform-specific chats
  ): Promise<ChatWithMessages>;

  // Search
  searchChats(query: string, limit?: number): Promise<Chat[]>;

  // Platform account methods
  createPlatformAccount(
    userId: number,
    platform: string,
    accountName: string,
    cookies: any[], // Or state: any
  ): Promise<PlatformAccount>;
  getPlatformAccountsByUserId(userId: number): Promise<PlatformAccount[]>;
  getPlatformAccountById(id: number): Promise<PlatformAccount | null>;
  updatePlatformAccount(
    id: number,
    updates: Partial<PlatformAccount>,
  ): Promise<void>;
  deletePlatformAccount(id: number): Promise<void>;
}

export class SqliteAdapter implements DatabaseAdapter {
  private db: sqlite.Database<sqlite3.Database, sqlite3.Statement>;

  constructor(private dbPath: string = "./main.db") {
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

    // Chat table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('chatgpt', 'claude', 'grok', 'gemini', 'other')),
        platform_chat_id TEXT NOT NULL,
        url TEXT,
        tags TEXT, -- JSON array
        is_favorite BOOLEAN DEFAULT FALSE,
        is_archived BOOLEAN DEFAULT FALSE,
        message_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(platform, platform_chat_id)
      )
    `);

    // Messages table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        metadata TEXT, -- JSON object
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
      )
    `);

    await this.db.run(`
      CREATE TABLE IF NOT EXISTS platform_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL,
      cookies TEXT NOT NULL, -- JSON-serialized array of cookies or state
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, platform, account_name) -- Prevent duplicates per user/platform/label
      )
    `);

    // Trigger to update message_count
    await this.db.run(`
      CREATE TRIGGER IF NOT EXISTS update_message_count
      AFTER INSERT ON messages
      BEGIN
        UPDATE chats SET
          message_count = (SELECT COUNT(*) FROM messages WHERE chat_id = NEW.chat_id),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.chat_id;
      END
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
      `SELECT 1 FROM revoked_tokens WHERE jti = ? AND expires_at < datetime('now')`,
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

  // Chat methods
  async createChat(
    data: Omit<Chat, "id" | "created_at" | "updated_at" | "message_count">,
  ): Promise<Chat> {
    const { lastID } = await this.db.run(
      `INSERT INTO chats (title, platform, platform_chat_id, url, tags, is_favorite, is_archived)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.platform,
        data.platform_chat_id,
        data.url || null,
        data.tags ? JSON.stringify(data.tags) : null,
        data.is_favorite || false,
        data.is_archived || false,
      ],
    );
    return this.getChatById(lastID as number) as Promise<Chat>;
  }

  async getChatById(id: number): Promise<Chat | null> {
    const row = await this.db.get(`SELECT * FROM chats WHERE id = ?`, [id]);
    return row ? this.serializeChat(row) : null;
  }

  async getChatByPlatformId(
    platform: string,
    platformChatId: string,
  ): Promise<Chat | null> {
    const row = await this.db.get(
      `SELECT * FROM chats WHERE platform = ? AND platform_chat_id = ?`,
      [platform, platformChatId],
    );
    return row ? this.serializeChat(row) : null;
  }

  async getChats(filters: {
    platform?: string;
    is_favorite?: boolean;
    is_archived?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<Chat[]> {
    let query = `SELECT * FROM chats WHERE 1=1`;
    const params: any[] = [];

    if (filters.platform) {
      query += ` AND platform = ?`;
      params.push(filters.platform);
    }
    if (filters.is_favorite !== undefined) {
      query += ` AND is_favorite = ?`;
      params.push(filters.is_favorite);
    }
    if (filters.is_archived !== undefined) {
      query += ` AND is_archived = ?`;
      params.push(filters.is_archived);
    }
    if (filters.tags?.length) {
      // Simple tag search - can be improved with FTS
      const tagConditions = filters.tags.map(() => `tags LIKE ?`).join(" AND ");
      query += ` AND (${tagConditions})`;
      filters.tags.forEach((tag) => params.push(`%"${tag}"%`));
    }

    query += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
      if (filters.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }

    const rows = await this.db.all(query, params);
    return rows.map(this.serializeChat);
  }

  async updateChat(id: number, updates: Partial<Chat>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === "tags") {
        fields.push("tags = ?");
        values.push(value ? JSON.stringify(value) : null);
      } else if (key !== "id" && key !== "created_at") {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await this.db.run(
      `UPDATE chats SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
  }

  async deleteChat(id: number): Promise<void> {
    await this.db.run(`DELETE FROM chats WHERE id = ?`, [id]);
  }

  async createMessage(
    data: Omit<Message, "id" | "created_at">,
  ): Promise<Message> {
    const { lastID } = await this.db.run(
      `INSERT INTO messages (chat_id, role, content, timestamp, metadata) VALUES (?, ?, ?, ?, ?)`,
      [
        data.chat_id,
        data.role,
        data.content,
        data.timestamp,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ],
    );
    const message = await this.db.get(`SELECT * FROM messages WHERE id = ?`, [
      lastID,
    ]);
    return this.serializeMessage(message);
  }

  async getMessagesByChat(chatId: number): Promise<Message[]> {
    const rows = await this.db.all(
      `SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC`,
      [chatId],
    );
    return rows.map(this.serializeMessage);
  }

  async getChatWithMessages(chatId: number): Promise<ChatWithMessages | null> {
    const chat = await this.getChatById(chatId);
    if (!chat) return null;

    const messages = await this.getMessagesByChat(chatId);
    return { ...chat, messages };
  }

  async deleteMessagesByChat(chatId: number): Promise<void> {
    await this.db.run(`DELETE FROM messages WHERE chat_id = ?`, [chatId]);
  }

  async createChatWithMessages(
    chatData: Omit<Chat, "id" | "created_at" | "updated_at" | "message_count">,
    messagesData: Omit<Message, "id" | "chat_id" | "created_at">[],
  ): Promise<ChatWithMessages> {
    // Check if chat already exists
    const existingChat = await this.getChatByPlatformId(
      chatData.platform,
      chatData.platform_chat_id,
    );

    let chat: Chat;
    if (existingChat) {
      // Update existing chat
      await this.updateChat(existingChat.id, chatData);
      // Clear existing messages
      await this.deleteMessagesByChat(existingChat.id);
      chat = await this.getChatById(existingChat.id) as Chat;
    } else {
      // Create new chat
      chat = await this.createChat(chatData);
    }

    // Add messages
    const messages: Message[] = [];
    for (const msgData of messagesData) {
      const message = await this.createMessage({
        ...msgData,
        chat_id: chat.id,
      });
      messages.push(message);
    }

    return { ...chat, messages };
  }

  async searchChats(query: string, limit = 50): Promise<Chat[]> {
    const rows = await this.db.all(
      `SELECT * FROM chats
       WHERE title LIKE ? OR platform_chat_id LIKE ?
       ORDER BY created_at DESC LIMIT ?`,
      [`%${query}%`, `%${query}%`, limit],
    );
    return rows.map(this.serializeChat);
  }

  private serializeChat(row: any): Chat {
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      is_favorite: Boolean(row.is_favorite),
      is_archived: Boolean(row.is_archived),
    };
  }

  private serializeMessage(row: any): Message {
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  // Create a new account
  async createPlatformAccount(
    userId: number,
    platform: string,
    accountName: string,
    cookies: any[], // Or state: any
  ): Promise<PlatformAccount> {
    const { lastID } = await this.db.run(
      `INSERT INTO platform_accounts (user_id, platform, account_name, cookies) VALUES (?, ?, ?, ?)`,
      [userId, platform, accountName, JSON.stringify(cookies)],
    );
    return this.getPlatformAccountById(lastID as number) as Promise<
      PlatformAccount
    >;
  }

  // Get all accounts for a user
  async getPlatformAccountsByUserId(
    userId: number,
  ): Promise<PlatformAccount[]> {
    const rows = await this.db.all(
      `SELECT * FROM platform_accounts WHERE user_id = ?`,
      [userId],
    );
    return rows.map((row) => ({
      ...row,
      cookies: JSON.parse(row.cookies),
    }));
  }

  // Get by ID (for updates/deletes)
  async getPlatformAccountById(id: number): Promise<PlatformAccount | null> {
    const row = await this.db.get(
      `SELECT * FROM platform_accounts WHERE id = ?`,
      [id],
    );
    return row ? { ...row, cookies: JSON.parse(row.cookies) } : null;
  }

  // Update (e.g., refresh cookies)
  async updatePlatformAccount(
    id: number,
    updates: Partial<PlatformAccount>,
  ): Promise<void> {
    // Similar to updateChat, serialize cookies if updated
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === "cookies") {
        fields.push("cookies = ?");
        values.push(value ? JSON.stringify(value) : null);
      } else if (key !== "id" && key !== "user_id" && key !== "created_at") {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await this.db.run(
      `UPDATE platform_accounts SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
  }

  // Delete
  async deletePlatformAccount(id: number): Promise<void> {
    await this.db.run(`DELETE FROM platform_accounts WHERE id = ?`, [id]);
  }
}
