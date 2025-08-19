// =============================================================================
// CHAT SERVICE & SOURCE MANAGER
// =============================================================================
import { chromium, Page } from "playwright";
import { randomUUID } from "node:crypto";
import { DatabaseAdapter } from "./db.ts";
import {
  Chat,
  ChatSource,
  ChatWithMessages,
  CreateChatRequest,
  CreateMessageRequest,
  Message,
  UpdateChatRequest,
} from "./schema.ts";

export class ChatService {
  private sources: Map<string, { source: ChatSource; accountId: number }> =
    new Map();

  constructor(private db: DatabaseAdapter) {}

  async loadUserSources(userId: number): Promise<void> {
    const accounts = await this.db.getPlatformAccountsByUserId(userId);
    for (const account of accounts) {
      const sourceName = `${account.platform}-${account.account_name}`;
      let source: ChatSource;
      switch (account.platform) {
        case "chatgpt":
          source = new ChatGPTSource(account.cookies);
          break;
        case "claude":
          source = new ClaudeSource(account.cookies);
          break;
        case "grok":
          source = new GrokSource(account.cookies);
          break;
        case "gemini":
          source = new GeminiSource(account.cookies);
          break;
        default:
          throw new Error(`Unsupported platform: ${account.platform}`);
      }
      this.sources.set(sourceName, { source, accountId: account.id });
    }
  }

  // Source management
  registerSource(source: ChatSource, accountId: number): void {
    const sourceName = `${source.platform}-${accountId}`; // Fallback naming if no account_name
    this.sources.set(sourceName, { source, accountId });
  }

  getRegisteredSources(): ChatSource[] {
    return Array.from(this.sources.values()).map(({ source }) => source);
  }

  // Sync data from all sources
  async syncAllSources(): Promise<{ success: number; errors: string[] }> {
    const results = { success: 0, errors: [] as string[] };

    for (const [key, { source, accountId }] of this.sources.entries()) {
      try {
        if (!(await source.isAvailable())) {
          results.errors.push(`${key}: Source not available`);
          continue;
        }

        const chats = await source.getChats();

        for (const chatData of chats) {
          try {
            const messages = await source.getMessages(
              chatData.platform_chat_id,
            );
            await this.db.createChatWithMessages(chatData, messages, accountId);
            results.success++;
          } catch (error) {
            results.errors.push(
              `${key}/${chatData.platform_chat_id}: ${error}`,
            );
          }
        }
      } catch (error) {
        results.errors.push(`${key}: ${error}`);
      } finally {
        await source.close();
      }
    }

    return results;
  }

  // Chat CRUD operations
  async createChat(data: CreateChatRequest): Promise<Chat> {
    return await this.db.createChat({
      ...data,
      is_favorite: false,
      is_archived: false,
    });
  }

  async getChats(filters?: {
    platform?: string;
    is_favorite?: boolean;
    is_archived?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
    account_id?: number;
  }): Promise<Chat[]> {
    return await this.db.getChats(filters);
  }

  async getChatById(id: number): Promise<Chat | null> {
    return await this.db.getChatById(id);
  }

  async getChatWithMessages(id: number): Promise<ChatWithMessages | null> {
    return await this.db.getChatWithMessages(id);
  }

  async updateChat(id: number, updates: UpdateChatRequest): Promise<void> {
    await this.db.updateChat(id, updates);
  }

  async deleteChat(id: number): Promise<void> {
    await this.db.deleteChat(id);
  }

  async searchChats(query: string, limit?: number): Promise<Chat[]> {
    return await this.db.searchChats(query, limit);
  }

  // Message operations
  async createMessage(data: CreateMessageRequest): Promise<Message> {
    return await this.db.createMessage({
      metadata: data.metadata,
      chat_id: data.chat_id,
      role: data.role,
      content: data.content,
      timestamp: data.timestamp || new Date(),
    });
  }

  // Utility methods
  async getStats(): Promise<{
    totalChats: number;
    totalMessages: number;
    platformBreakdown: Record<string, number>;
    favoriteCount: number;
  }> {
    const allChats = await this.db.getChats();

    const platformBreakdown: Record<string, number> = {};
    let favoriteCount = 0;
    let totalMessages = 0;

    allChats.forEach((chat) => {
      platformBreakdown[chat.platform] =
        (platformBreakdown[chat.platform] || 0) + 1;
      if (chat.is_favorite) favoriteCount++;
      totalMessages += chat.message_count;
    });

    return {
      totalChats: allChats.length,
      totalMessages,
      platformBreakdown,
      favoriteCount,
    };
  }
}

// =============================================================================
// REAL SCRAPER IMPLEMENTATIONS USING PLAYWRIGHT
// =============================================================================

// Note: These implementations use Playwright for browser automation.
// Authentication is handled via provided cookies (e.g., obtained from a browser extension or manual export).
// Cookies must be provided in the constructor for each source.
// In a production setup, cookies could be stored securely per user in the database and passed when registering the source.
// Timestamps are approximated since most platforms don't expose exact message timestamps in the UI.

// Add to deno.json imports: "playwright": "npm:playwright@^1.47.0"

export class ChatGPTSource implements ChatSource {
  name = "ChatGPT";
  platform = "chatgpt" as const;

  private browser: any | null = null;
  private context: any | null = null;
  private page: Page | null = null;

  constructor(
    private cookies: {
      name: string;
      value: string;
      domain?: string;
      path?: string;
    }[],
  ) {}

  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    await this.context.addCookies(this.cookies.map((cookie) => ({
      ...cookie,
      domain: cookie.domain || ".openai.com",
      path: cookie.path || "/",
    })));
    this.page = await this.context.newPage();
  }

  async isAvailable(): Promise<boolean> {
    await this.initBrowser();
    if (!this.page) return false;

    try {
      await this.page.goto("https://chat.openai.com/", {
        waitUntil: "networkidle",
      });
      const isLoggedIn = await this.page.evaluate(() =>
        !document.querySelector('[data-testid="login-button"]')
      );
      return isLoggedIn;
    } catch {
      return false;
    }
  }

  async getChats(): Promise<Chat[]> {
    await this.initBrowser();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto("https://chat.openai.com/", {
      waitUntil: "networkidle",
    });

    const chatElements = await this.page.locator('nav a[href^="/c/"]').all();

    const chats: Chat[] = [];
    for (const elem of chatElements) {
      const href = await elem.getAttribute("href");
      if (!href) continue;

      const platform_chat_id = href.split("/c/")[1];
      const title = await elem.locator(".truncate").innerText() ||
        "Untitled Chat";
      const url = `https://chat.openai.com${href}`;

      chats.push({
        id: 0, // Will be set by DB
        title,
        platform: this.platform,
        platform_chat_id,
        url,
        tags: [],
        is_favorite: false,
        is_archived: false,
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return chats;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    await this.initBrowser();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto(`https://chat.openai.com/c/${chatId}`, {
      waitUntil: "networkidle",
    });

    const messageElements = await this.page.locator(
      "[data-message-author-role]",
    ).all();

    const messages: Message[] = [];
    let timestamp = new Date();

    for (const elem of messageElements) {
      const role = (await elem.getAttribute("data-message-author-role")) as
        | "user"
        | "assistant"
        | "system";
      let content = await elem.innerText();
      content = content.trim();

      // Adjust timestamp backwards for approximation
      timestamp = new Date(timestamp.getTime() - 10000); // 10 seconds apart

      messages.push({
        id: 0, // Will be set by DB
        chat_id: 0, // Will be set later
        role,
        content,
        timestamp: timestamp,
        created_at: new Date().toISOString(),
      });
    }

    return messages;
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close();
  }
}

export class ClaudeSource implements ChatSource {
  name = "Claude";
  platform = "claude" as const;

  private browser: any | null = null;
  private context: any | null = null;
  private page: Page | null = null;

  constructor(
    private cookies: {
      name: string;
      value: string;
      domain?: string;
      path?: string;
    }[],
  ) {}

  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    await this.context.addCookies(this.cookies.map((cookie) => ({
      ...cookie,
      domain: cookie.domain || ".claude.ai",
      path: cookie.path || "/",
    })));
    this.page = await this.context.newPage();
  }

  async isAvailable(): Promise<boolean> {
    await this.initBrowser();
    if (!this.page) return false;

    try {
      await this.page.goto("https://claude.ai/chats", {
        waitUntil: "networkidle",
      });
      const isLoggedIn = await this.page.evaluate(() =>
        !!document.querySelector('ul[data-testid="chat-list"]')
      );
      return isLoggedIn;
    } catch {
      return false;
    }
  }

  async getChats(): Promise<Chat[]> {
    await this.initBrowser();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto("https://claude.ai/chats", {
      waitUntil: "networkidle",
    });

    const chatElements = await this.page.locator('ul li a[href^="/chat/"]')
      .all();

    const chats: Chat[] = [];
    for (const elem of chatElements) {
      const href = await elem.getAttribute("href");
      if (!href) continue;

      const platform_chat_id = href.split("/chat/")[1];
      const title = await elem.innerText() || "Untitled Chat";
      const url = `https://claude.ai${href}`;

      chats.push({
        id: 0,
        title,
        platform: this.platform,
        platform_chat_id,
        url,
        tags: [],
        is_favorite: false,
        is_archived: false,
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return chats;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    await this.initBrowser();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto(`https://claude.ai/chat/${chatId}`, {
      waitUntil: "networkidle",
    });

    const messageElements = await this.page.locator(".conversation-item").all();

    const messages: Message[] = [];
    let timestamp = new Date();

    for (const elem of messageElements) {
      const isUser = await elem.evaluate((el) => el.classList.contains("user"));
      const role = isUser ? "user" : "assistant";
      let content = await elem.innerText();
      content = content.trim();

      timestamp = new Date(timestamp.getTime() - 10000);

      messages.push({
        id: 0,
        chat_id: 0,
        role,
        content,
        timestamp: timestamp,
        created_at: new Date().toISOString(),
      });
    }

    return messages;
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close();
  }
}

export class GrokSource implements ChatSource {
  name = "Grok";
  platform = "grok" as const;

  private browser: any | null = null;
  private context: any | null = null;
  private page: Page | null = null;

  constructor(
    private cookies: {
      name: string;
      value: string;
      domain?: string;
      path?: string;
    }[],
  ) {}

  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    await this.context.addCookies(this.cookies.map((cookie) => ({
      ...cookie,
      domain: cookie.domain || ".x.com",
      path: cookie.path || "/",
    })));
    this.page = await this.context.newPage();
  }

  async isAvailable(): Promise<boolean> {
    await this.initBrowser();
    if (!this.page) return false;

    try {
      await this.page.goto("https://grok.x.com/", { waitUntil: "networkidle" });
      // Check for presence of chat list or absence of login prompt
      const isLoggedIn = await this.page.evaluate(() =>
        !!document.querySelector('[data-testid="side-nav"]')
      );
      return isLoggedIn;
    } catch {
      return false;
    }
  }

  async getChats(): Promise<Chat[]> {
    await this.initBrowser();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto("https://grok.x.com/", { waitUntil: "networkidle" });

    // Assuming sidebar with chats similar to other platforms
    const chatElements = await this.page.locator(
      '[data-testid="conversation-list"] a',
    ).all();

    const chats: Chat[] = [];
    for (const elem of chatElements) {
      const href = await elem.getAttribute("href");
      if (!href || !href.includes("/grok/")) continue;

      const platform_chat_id = href.split("/grok/")[1] || randomUUID();
      const title = await elem.innerText() || "Untitled Chat";
      const url = `https://grok.x.com${href}`;

      chats.push({
        id: 0,
        title,
        platform: this.platform,
        platform_chat_id,
        url,
        tags: [],
        is_favorite: false,
        is_archived: false,
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return chats;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    await this.initBrowser();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto(`https://grok.x.com/grok/${chatId}`, {
      waitUntil: "networkidle",
    });

    const messageElements = await this.page.locator('[data-testid="message"]')
      .all();

    const messages: Message[] = [];
    let timestamp = new Date();

    for (const elem of messageElements) {
      const role = (await elem.getAttribute("data-role")) as
        | "user"
        | "assistant"
        | "system" || "assistant";
      let content = await elem.innerText();
      content = content.trim();

      timestamp = new Date(timestamp.getTime() - 10000);

      messages.push({
        id: 0,
        chat_id: 0,
        role,
        content,
        timestamp: timestamp,
        created_at: new Date().toISOString(),
      });
    }

    return messages;
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close();
  }
}

export class GeminiSource implements ChatSource {
  name = "Gemini";
  platform = "gemini" as const;

  private browser: any | null = null;
  private context: any | null = null;
  private page: Page | null = null;

  constructor(
    private cookies: {
      name: string;
      value: string;
      domain?: string;
      path?: string;
    }[],
  ) {}

  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    await this.context.addCookies(this.cookies.map((cookie) => ({
      ...cookie,
      domain: cookie.domain || ".google.com",
      path: cookie.path || "/",
    })));
    this.page = await this.context.newPage();
  }

  async isAvailable(): Promise<boolean> {
    await this.initBrowser();
    if (!this.page) return false;

    try {
      await this.page.goto("https://gemini.google.com/app", {
        waitUntil: "networkidle",
      });
      const isLoggedIn = await this.page.evaluate(() =>
        !!document.querySelector("mat-list")
      );
      return isLoggedIn;
    } catch {
      return false;
    }
  }

  async getChats(): Promise<Chat[]> {
    await this.initBrowser();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto("https://gemini.google.com/app", {
      waitUntil: "networkidle",
    });

    const chatElements = await this.page.locator("mat-list-item").all();

    const chats: Chat[] = [];
    for (const elem of chatElements) {
      const href = await elem.getAttribute("href");
      if (!href) continue;

      const platform_chat_id = href.split("/app/")[1] || randomUUID();
      const title = await elem.innerText() || "Untitled Chat";
      const url = `https://gemini.google.com${href}`;

      chats.push({
        id: 0,
        title,
        platform: this.platform,
        platform_chat_id,
        url,
        tags: [],
        is_favorite: false,
        is_archived: false,
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return chats;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    await this.initBrowser();
    if (!this.page) throw new Error("Browser not initialized");

    await this.page.goto(`https://gemini.google.com/app/${chatId}`, {
      waitUntil: "networkidle",
    });

    const messageElements = await this.page.locator(
      "rich-textarea, bot-response",
    ).all();

    const messages: Message[] = [];
    let timestamp = new Date();
    let roleToggle: "user" | "assistant" | "system" = "user"; // Alternate if no attribute

    for (const elem of messageElements) {
      let content = await elem.innerText();
      content = content.trim();

      const role: "user" | "assistant" | "system" = roleToggle;
      roleToggle = role === "user" ? "assistant" : "user";

      timestamp = new Date(timestamp.getTime() - 10000);

      messages.push({
        id: 0,
        chat_id: 0,
        role,
        content,
        timestamp: timestamp,
        created_at: new Date().toISOString(),
      });
    }

    return messages;
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close();
  }
}

// Usage example in main.ts:
// await chatService.loadUserSources(req.user.id);
// Similarly for others.
