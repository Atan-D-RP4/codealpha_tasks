import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import process from "node:process";

import {
  CreateChatSchema,
  CreateMessageSchema,
  LoginSchema,
  RegisterSchema,
  UpdateChatSchema,
  User,
} from "./schema.ts";

import { SqliteAdapter } from "./db.ts";
import {
  apiAuthMiddleware,
  AuthMiddleware,
  AuthService,
  requireAuth,
} from "./auth.ts";

import { JWTService } from "./jwt.ts";
import { SessionManager } from "./session.ts";
import { ChatService } from "./chat.ts";

// =============================================================================
// SERVER SETUP
// =============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
      accessToken?: string;
      authType?: "session" | "jwt";
      roles?: "user" | "admin" | "guest";
    }
  }
}

async function startServer() {
  const db = new SqliteAdapter();
  await db.connect();

  // JWT configuration
  const JWT_SECRET = Deno.env.get("JWT_SECRET") ||
    "your-super-secret-jwt-key-change-in-production";
  const JWT_REFRESH_SECRET = Deno.env.get("JWT_REFRESH_SECRET") ||
    "your-super-secret-refresh-key-change-in-production";

  // Initialize services
  const jwtService = new JWTService(JWT_SECRET, JWT_REFRESH_SECRET, db);
  const sessionManager = new SessionManager(db, jwtService);
  const authService = new AuthService(db, sessionManager, jwtService);

  const chatService = new ChatService(db);
  // chatService.registerSource(new ScraperSource());

  // Cleanup expired sessions
  setInterval(() => {
    sessionManager.deleteExpiredSessions().catch(console.error);
  }, 60 * 60 * 1000);

  const PORT = process.env.PORT || 8000;
  const UI_ORIGIN = Deno.env.get("UI_ORIGIN") || "http://localhost:3000";

  const app = express();
  const apiRoutes = express.Router();
  const mobileApiRoutes = express.Router();

  app.use(express.json());
  app.use(cookieParser());

  app.use(
    cors({
      origin: [UI_ORIGIN, "http://localhost:3000", "http://localhost:3001"], // Support multiple origins for development
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // =============================================================================
  // WEB API ROUTES (Cookie-based sessions + JWT support)
  // =============================================================================

  apiRoutes.use(AuthMiddleware(authService, { preferJWT: false }));

  // Auth routes
  apiRoutes.post("/register", async (req: Request, res: Response) => {
    try {
      const data = RegisterSchema.parse(req.body);
      const result = await authService.register(data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ success: false, error: err.message });
    }
  });

  apiRoutes.post("/login", async (req: Request, res: Response) => {
    try {
      const data = LoginSchema.parse(req.body);
      const result = await authService.loginWithSession(data);
      res.cookie("session_id", result.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(200).json({
        success: true,
        data: { user: result.user },
      });
    } catch (error) {
      const err = error as Error;
      res.status(401).json({ success: false, error: err.message });
    }
  });

  apiRoutes.post("/logout", async (req: Request, res: Response) => {
    const sessionId = req.sessionId;
    if (sessionId) {
      await authService.logout(sessionId);
    }
    res.clearCookie("session_id");
    res.json({ success: true });
  });

  apiRoutes.get("/me", requireAuth, async (req: Request, res: Response) => {
    console.log("/api/me endpoint hit");
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
      },
    });
  });

  // Get all chats with filtering
  apiRoutes.get("/chats", async (req: Request, res: Response) => {
    try {
      const {
        platform,
        is_favorite,
        is_archived,
        tags,
        limit = "50",
        offset = "0",
      } = req.query;

      const filters = {
        platform: platform as string,
        is_favorite: is_favorite === "true"
          ? true
          : is_favorite === "false"
          ? false
          : undefined,
        is_archived: is_archived === "true"
          ? true
          : is_archived === "false"
          ? false
          : undefined,
        tags: tags ? (tags as string).split(",") : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const chats = await chatService.getChats(filters);
      res.json({ success: true, data: chats });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get chat by ID with messages
  apiRoutes.get("/chats/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const chat = await chatService.getChatWithMessages(id);

      if (!chat) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      res.json({ success: true, data: chat });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Create chat
  apiRoutes.post("/chats", async (req: Request, res: Response) => {
    try {
      const data = CreateChatSchema.parse(req.body);
      const chat = await chatService.createChat(data);
      res.status(201).json({ success: true, data: chat });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  });

  // Update chat
  apiRoutes.patch("/chats/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = UpdateChatSchema.parse(req.body);

      await chatService.updateChat(id, updates);
      const updatedChat = await chatService.getChatById(id);

      res.json({ success: true, data: updatedChat });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  });

  // Delete chat
  apiRoutes.delete("/chats/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatService.deleteChat(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Search chats
  apiRoutes.get("/chats/search/:query", async (req: Request, res: Response) => {
    try {
      const { query } = req.params;
      const { limit = "20" } = req.query;

      const chats = await chatService.searchChats(
        query,
        parseInt(limit as string),
      );
      res.json({ success: true, data: chats });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Add message to chat
  apiRoutes.post("/chats/:id/messages", async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.id);
      const data = CreateMessageSchema.parse({
        ...req.body,
        chat_id: chatId,
      });

      const message = await chatService.createMessage(data);
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  });

  // Sync all sources
  apiRoutes.post("/chats/sync", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      // Load user sources before syncing
      await chatService.loadUserSources(userId);
      const result = await chatService.syncAllSources();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get stats
  apiRoutes.get("/chats/stats/overview", async (req: Request, res: Response) => {
    try {
      const stats = await chatService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get registered sources
  apiRoutes.get("/chats/sources/list", async (req: Request, res: Response) => {
    try {
      const sources = chatService.getRegisteredSources().map((source) => ({
        name: source.name,
        platform: source.platform,
      }));
      res.json({ success: true, data: sources });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Platform Account Management Routes
  
  // Get user's platform accounts
  apiRoutes.get("/platform-accounts", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const accounts = await db.getPlatformAccountsByUserId(userId);
      // Don't send cookies in the response for security
      const sanitizedAccounts = accounts.map(account => ({
        id: account.id,
        platform: account.platform,
        account_name: account.account_name,
        created_at: account.created_at,
      }));
      res.json({ success: true, data: sanitizedAccounts });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Create new platform account
  apiRoutes.post("/platform-accounts", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { platform, account_name, cookies } = req.body;
      
      // Validate input
      if (!platform || !account_name || !cookies) {
        return res.status(400).json({ 
          success: false, 
          error: "Platform, account name, and cookies are required" 
        });
      }
      
      // Validate platform
      const validPlatforms = ["chatgpt", "claude", "grok", "gemini"];
      if (!validPlatforms.includes(platform)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid platform. Must be one of: " + validPlatforms.join(", ") 
        });
      }
      
      // Validate cookies format
      if (!Array.isArray(cookies)) {
        return res.status(400).json({ 
          success: false, 
          error: "Cookies must be an array" 
        });
      }
      
      for (const cookie of cookies) {
        if (!cookie.name || !cookie.value) {
          return res.status(400).json({ 
            success: false, 
            error: "Each cookie must have name and value" 
          });
        }
      }
      
      const account = await db.createPlatformAccount(userId, platform, account_name, cookies);
      
      // Register the source with chat service
      await chatService.loadUserSources(userId);
      
      res.status(201).json({ 
        success: true, 
        data: {
          id: account.id,
          platform: account.platform,
          account_name: account.account_name,
          created_at: account.created_at,
        }
      });
    } catch (error) {
      if ((error as Error).message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ 
          success: false, 
          error: "An account with this name already exists for this platform" 
        });
      } else {
        res.status(500).json({ success: false, error: (error as Error).message });
      }
    }
  });

  // Update platform account
  apiRoutes.put("/platform-accounts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const accountId = parseInt(req.params.id);
      const { account_name, cookies } = req.body;
      
      // Verify account belongs to user
      const existingAccount = await db.getPlatformAccountById(accountId);
      if (!existingAccount || existingAccount.user_id !== userId) {
        return res.status(404).json({ 
          success: false, 
          error: "Platform account not found" 
        });
      }
      
      const updates: any = {};
      if (account_name) updates.account_name = account_name;
      if (cookies) {
        // Validate cookies format
        if (!Array.isArray(cookies)) {
          return res.status(400).json({ 
            success: false, 
            error: "Cookies must be an array" 
          });
        }
        
        for (const cookie of cookies) {
          if (!cookie.name || !cookie.value) {
            return res.status(400).json({ 
              success: false, 
              error: "Each cookie must have name and value" 
            });
          }
        }
        updates.cookies = cookies;
      }
      
      await db.updatePlatformAccount(accountId, updates);
      
      // Reload sources
      await chatService.loadUserSources(userId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Delete platform account
  apiRoutes.delete("/platform-accounts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const accountId = parseInt(req.params.id);
      
      // Verify account belongs to user
      const existingAccount = await db.getPlatformAccountById(accountId);
      if (!existingAccount || existingAccount.user_id !== userId) {
        return res.status(404).json({ 
          success: false, 
          error: "Platform account not found" 
        });
      }
      
      await db.deletePlatformAccount(accountId);
      
      // Reload sources
      await chatService.loadUserSources(userId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // =============================================================================
  // MOBILE/API ROUTES (JWT-based)
  // =============================================================================

  // Mobile API Routes (JWT only)
  mobileApiRoutes.post("/register", async (req: Request, res: Response) => {
    try {
      const data = RegisterSchema.parse(req.body);
      const result = await authService.register(data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ success: false, error: err.message });
    }
  });

  mobileApiRoutes.post("/login", async (req: Request, res: Response) => {
    try {
      const data = LoginSchema.parse(req.body);
      const result = await authService.loginWithJWT(data);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const err = error as Error;
      res.status(401).json({ success: false, error: err.message });
    }
  });

  mobileApiRoutes.post("/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: "Refresh token required",
        });
      }

      const tokens = await authService.refreshTokens(refreshToken);
      if (!tokens) {
        return res.status(401).json({
          success: false,
          error: "Invalid refresh token",
        });
      }

      res.json({ success: true, data: tokens });
    } catch (error) {
      const err = error as Error;
      res.status(401).json({ success: false, error: err.message });
    }
  });

  // Apply JWT auth middleware to mobile API routes
  mobileApiRoutes.use(apiAuthMiddleware(authService));

  mobileApiRoutes.post("/logout", async (req: Request, res: Response) => {
    try {
      const token = req.accessToken;
      if (token) {
        await authService.logoutJWT(token);
      }
      res.json({ success: true });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ success: false, error: err.message });
    }
  });

  mobileApiRoutes.get("/me", (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
      },
    });
  });

  // Mount routes
  app.use("/api", apiRoutes);
  app.use("/api/mobile", mobileApiRoutes);

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date(),
    });
  });

  // Start server
  // Start server
  app.listen(PORT, () => {
    console.log("🚀 Chat Aggregator Server");
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🤖 Chats API: http://localhost:${PORT}/api/chats`);
    console.log(`🔍 Health: http://localhost:${PORT}/health`);
    console.log("");
    console.log("📋 Available Endpoints:");
    console.log("  GET    /api/chats - List all chats");
    console.log("  GET    /api/chats/:id - Get chat with messages");
    console.log("  POST   /api/chats - Create new chat");
    console.log("  PATCH  /api/chats/:id - Update chat");
    console.log("  DELETE /api/chats/:id - Delete chat");
    console.log("  GET    /api/chats/search/:query - Search chats");
    console.log("  POST   /api/chats/sync - Sync from all sources");
    console.log("  GET    /api/chats/stats/overview - Get stats");
    console.log("  GET    /api/platform-accounts - List platform accounts");
    console.log("  POST   /api/platform-accounts - Add platform account");
    console.log("");
  });
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT. Graceful shutdown...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM. Graceful shutdown...");
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
