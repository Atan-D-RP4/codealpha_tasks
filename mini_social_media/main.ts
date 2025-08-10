// main.ts - Social Media Platform Server
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import process from "node:process";

import {
  CreateCommentSchema,
  CreatePostSchema,
  LoginSchema,
  RegisterSchema,
  UpdatePostSchema,
  UpdateProfileSchema,
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
import { SocialMediaService } from "./social.ts";

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
  const socialService = new SocialMediaService(db);

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
    const user = req.user!;
    const profile = await socialService.getUserProfile(user.id, user.id);
    console.log("User profile:", profile);
    res.json({
      success: true,
      data: profile,
    });
  });

  // =============================================================================
  // PROFILE ROUTES
  // =============================================================================

  apiRoutes.patch(
    "/profile",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const data = UpdateProfileSchema.parse(req.body);
        const result = await socialService.updateProfile(req.user!.id, data);
        res.json({ success: true, data: result });
      } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.get("/users/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID",
        });
      }

      const profile = await socialService.getUserProfile(userId, req.user?.id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =============================================================================
  // POST ROUTES
  // =============================================================================

  apiRoutes.post("/posts", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = CreatePostSchema.parse(req.body);
      const result = await socialService.createPost(req.user!.id, data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ success: false, error: err.message });
    }
  });

  apiRoutes.get("/posts", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await socialService.getPosts(limit, offset, req.user?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ success: false, error: err.message });
    }
  });

  apiRoutes.get(
    "/posts/feed",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await socialService.getFeed(req.user!.id, limit, offset);
        res.json({ success: true, data: result });
      } catch (error) {
        const err = error as Error;
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.get("/posts/:postId", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId);
      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid post ID",
        });
      }

      const post = await socialService.getPost(postId, req.user?.id);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      res.json({ success: true, data: { post } });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ success: false, error: err.message });
    }
  });

  apiRoutes.put(
    "/posts/:postId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid post ID",
          });
        }

        const data = UpdatePostSchema.parse(req.body);
        const post = await socialService.updatePost(postId, req.user!.id, data);

        if (!post) {
          return res.status(404).json({
            success: false,
            error: "Post not found or not authorized",
          });
        }

        res.json({ success: true, data: { post } });
      } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.delete(
    "/posts/:postId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid post ID",
          });
        }

        const success = await socialService.deletePost(postId, req.user!.id);
        if (!success) {
          return res.status(404).json({
            success: false,
            error: "Post not found or not authorized",
          });
        }

        res.json({ success: true });
      } catch (error) {
        const err = error as Error;
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.get("/users/:userId/posts", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID",
        });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await socialService.getUserPosts(
        userId,
        limit,
        offset,
        req.user?.id,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =============================================================================
  // COMMENT ROUTES
  // =============================================================================

  apiRoutes.post(
    "/posts/:postId/comments",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid post ID",
          });
        }

        const data = CreateCommentSchema.parse(req.body);
        const result = await socialService.createComment(
          req.user!.id,
          postId,
          data,
        );
        res.status(201).json({ success: true, data: result });
      } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.get(
    "/posts/:postId/comments",
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid post ID",
          });
        }

        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await socialService.getPostComments(
          postId,
          limit,
          offset,
          req.user?.id,
        );
        res.json({ success: true, data: result });
      } catch (error) {
        const err = error as Error;
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.put(
    "/comments/:commentId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const commentId = parseInt(req.params.commentId);
        if (isNaN(commentId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid comment ID",
          });
        }

        const { content } = CreateCommentSchema.parse(req.body);
        const comment = await socialService.updateComment(
          commentId,
          req.user!.id,
          content,
        );

        if (!comment) {
          return res.status(404).json({
            success: false,
            error: "Comment not found or not authorized",
          });
        }

        res.json({ success: true, data: { comment } });
      } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.delete(
    "/comments/:commentId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const commentId = parseInt(req.params.commentId);
        if (isNaN(commentId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid comment ID",
          });
        }

        const success = await socialService.deleteComment(
          commentId,
          req.user!.id,
        );
        if (!success) {
          return res.status(404).json({
            success: false,
            error: "Comment not found or not authorized",
          });
        }

        res.json({ success: true });
      } catch (error) {
        const err = error as Error;
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  // =============================================================================
  // LIKE ROUTES
  // =============================================================================

  apiRoutes.post(
    "/posts/:postId/like",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.postId);
        if (isNaN(postId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid post ID",
          });
        }

        const result = await socialService.togglePostLike(req.user!.id, postId);
        res.json({ success: true, data: result });
      } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.post(
    "/comments/:commentId/like",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const commentId = parseInt(req.params.commentId);
        if (isNaN(commentId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid comment ID",
          });
        }

        const result = await socialService.toggleCommentLike(
          req.user!.id,
          commentId,
        );
        res.json({ success: true, data: result });
      } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, error: err.message });
      }
    },
  );

  // =============================================================================
  // FOLLOW ROUTES
  // =============================================================================

  apiRoutes.post(
    "/users/:userId/follow",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid user ID",
          });
        }

        const result = await socialService.toggleFollow(req.user!.id, userId);
        res.json({ success: true, data: result });
      } catch (error) {
        const err = error as Error;
        res.status(400).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.get(
    "/users/:userId/followers",
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid user ID",
          });
        }

        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await socialService.getFollowers(userId, limit, offset);
        res.json({ success: true, data: result });
      } catch (error) {
        const err = error as Error;
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  apiRoutes.get(
    "/users/:userId/following",
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid user ID",
          });
        }

        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await socialService.getFollowing(userId, limit, offset);
        res.json({ success: true, data: result });
      } catch (error) {
        const err = error as Error;
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  // =============================================================================
  // SEARCH ROUTES
  // =============================================================================

  apiRoutes.get("/search/users", async (req: Request, res: Response) => {
    console.log("Search users endpoint hit");
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
        });
      }

      const result = await socialService.searchUsers(query);
      console.log("Search users result:", result);
      res.json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ success: false, error: err.message });
    }
  });

  apiRoutes.get("/search/posts", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
        });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const result = await socialService.searchPosts(
        query,
        limit,
        req.user?.id,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ success: false, error: err.message });
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

  // Add all the same social media routes to mobile API (they'll use JWT auth automatically)
  mobileApiRoutes.post("/posts", async (req: Request, res: Response) => {
    try {
      const data = CreatePostSchema.parse(req.body);
      const result = await socialService.createPost(req.user!.id, data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ success: false, error: err.message });
    }
  });

  mobileApiRoutes.get("/posts", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await socialService.getPosts(limit, offset, req.user?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ success: false, error: err.message });
    }
  });

  mobileApiRoutes.get("/posts/feed", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await socialService.getFeed(req.user!.id, limit, offset);
      res.json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ success: false, error: err.message });
    }
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
    console.log("🚀 Social Media Platform API Server Starting");
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
    console.log(
      "  Posts: GET|POST /api/posts, GET /api/posts/feed, GET /api/users/:id/posts",
    );
    console.log("  Comments: GET|POST /api/posts/:id/comments");
    console.log(
      "  Likes: POST /api/posts/:id/like, POST /api/comments/:id/like",
    );
    console.log(
      "  Follow: POST /api/users/:id/follow, GET /api/users/:id/followers",
    );
    console.log(
      "  Search: GET /api/search/users?q=query, GET /api/search/posts?q=query",
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
