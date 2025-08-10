Mini Social Frontend (Next.js)

How to run
- cd ui
- deno task dev

The app proxies API requests to the Express server at http://localhost:8000 via next.config.ts rewrites.

Pages
- /           Landing hero
- /login      Sign in / Sign up (session cookie auth)
- /dashboard  Authenticated feed with create post and like
- /profile    Edit profile and view your posts
- /users/[id] Public profile page with follow/unfollow, posts, followers/following lists
- /posts/[id] Post details and comments
- /search     Search users and posts

Auth
- Uses cookie-based sessions with credentials: 'include' on fetch. See components/authContext.tsx.

Environment
- Ensure the server is running: deno run -A main.ts (PORT=8000 by default)
- Optionally set UI_ORIGIN in server env to http://localhost:3000 for CORS.
