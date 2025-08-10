"use client";

import React from "react";
import Container from "@/components/layout/Container.tsx";
import { useAuth } from "@/components/authContext.tsx";
import Button from "@/components/ui/Button.tsx";
import Input from "@/components/ui/Input.tsx";
import Alert from "@/components/ui/Alert.tsx";
import { createPost, getMyFeed, likePost } from "@/components/social/api.ts";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [content, setContent] = React.useState("");
  const [pageLoading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [feed, setFeed] = React.useState<Awaited<ReturnType<typeof getMyFeed>> | null>(null);

  const loadFeed = React.useCallback(async () => {
    try {
      const data = await getMyFeed({ limit: 20, offset: 0 });
      setFeed(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feed");
    }
  }, []);

  React.useEffect(() => { loadFeed(); }, [loadFeed]);
  React.useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createPost(content.trim());
      setContent("");
      await loadFeed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      await likePost(postId);
      await loadFeed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to like post");
    }
  };

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-2xl font-bold mb-6">Welcome{user ? `, ${user.username}` : ""}</h1>

        <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
          <label className="block mb-2 font-medium">Create a post</label>
          <Input
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <Button type="submit" disabled={loading || !content.trim()}>Post</Button>
          </div>
        </form>

        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        <div className="space-y-4">
          {feed?.posts.length ? feed.posts.map((p) => (
            <article key={p.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <header className="flex items-center justify-between mb-2">
                <div className="font-semibold">
                  {/* @ts-ignore */}
                  <Link href={`/users/${p.user?.id ?? p.user_id}`}>{p.user?.display_name || p.user?.username || `User #${p.user_id}`}</Link>
                </div>
                <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</div>
              </header>
              {/* @ts-ignore */}
              <Link href={`/posts/${p.id}`} className="block mb-3 whitespace-pre-wrap hover:underline">
                {p.content}
              </Link>
              <footer className="flex items-center gap-3 text-sm text-gray-600">
                <button onClick={() => handleLike(p.id)} className={`px-3 py-1 rounded-lg border ${p.is_liked ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-gray-50 border-gray-200 hover:border-gray-300"}`}>
                  ❤️ {p.likes_count}
                </button>
                <span>💬 {p.comments_count}</span>
              </footer>
            </article>
          )) : (
            <div className="text-gray-600">Your feed is empty. Follow someone or create your first post!</div>
          )}
        </div>
      </Container>
    </div>
  );
}
