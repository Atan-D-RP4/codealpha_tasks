import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import process from "node:process";

import { LoginSchema, RegisterSchema, User } from "./schema.ts";

import { SqliteAdapter } from "./db.ts";
import {
  apiAuthMiddleware,
  AuthMiddleware,
  AuthService,
  requireAuth,
} from "./auth.ts";

import { JWTService } from "./jwt.ts";
import { SessionManager } from "./session.ts";

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
      timestamp: new Date().toISOString(),
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log("🚀 Starting server...");
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Web API: http://localhost:${PORT}/api/`);
    console.log(`📱 Mobile API: http://localhost:${PORT}/api/mobile/`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
    console.log(`🎯 CORS Origin: ${UI_ORIGIN}`);
    console.log("");
    console.log("📋 Available Endpoints:");
    console.log("  Auth: POST /api/register, /api/login, /api/logout");
    console.log(
      "  Profile: GET /api/me, PATCH /api/profile, GET /api/users/:id",
    );
    console.log("");
    console.log(
      "⚠️  Remember to set JWT_SECRET and JWT_REFRESH_SECRET in production!",
    );
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
