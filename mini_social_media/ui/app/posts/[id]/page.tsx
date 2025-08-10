"use client";

import React from "react";
import Container from "@/components/layout/Container.tsx";
import Button from "@/components/ui/Button.tsx";
import Input from "@/components/ui/Input.tsx";
import Alert from "@/components/ui/Alert.tsx";
import { createComment, getComments, getPost, likeComment, likePost } from "@/components/social/api.ts";
import { useParams } from "next/navigation";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);
  const [post, setPost] = React.useState<Awaited<ReturnType<typeof getPost>> | null>(null);
  const [comments, setComments] = React.useState<Awaited<ReturnType<typeof getComments>> | null>(null);
  const [content, setContent] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [p, c] = await Promise.all([getPost(postId), getComments(postId)]);
      setPost(p); setComments(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [postId]);

  React.useEffect(() => { if (!Number.isNaN(postId)) load(); }, [postId, load]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await createComment(postId, content.trim());
      setContent("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to comment");
    }
  };

  const likeP = async () => { await likePost(postId); await load(); };
  const likeC = async (id: number) => { await likeComment(id); await load(); };

  if (!post) return null;

  return (
    <div className="py-8">
      <Container>
        {error && <Alert type="error" className="mb-4">{error}</Alert>}
        <article className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
          <header className="flex items-center justify-between mb-2">
            <div className="font-semibold">{post.post.user?.display_name || post.post.user?.username || `User #${post.post.user_id}`}</div>
            <div className="text-xs text-gray-500">{new Date(post.post.created_at).toLocaleString()}</div>
          </header>
          <p className="mb-3 whitespace-pre-wrap">{post.post.content}</p>
          <footer className="flex items-center gap-3 text-sm text-gray-600">
            <button onClick={likeP} className={`px-3 py-1 rounded-lg border ${post.post.is_liked ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-gray-50 border-gray-200 hover:border-gray-300"}`}>
              ❤️ {post.post.likes_count}
            </button>
            <span>💬 {post.post.comments_count}</span>
          </footer>
        </article>

        <form onSubmit={submitComment} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-4">
          <label className="block mb-2 font-medium">Add a comment</label>
          <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a comment..." />
          <div className="flex justify-end mt-3"><Button type="submit" disabled={!content.trim()}>Comment</Button></div>
        </form>

        <div className="space-y-3">
          {comments?.comments?.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-3 border">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium">{c.user?.display_name || c.user?.username || `User #${c.user_id}`}</div>
                <div className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
              </div>
              <div className="mb-2 whitespace-pre-wrap">{c.content}</div>
              <button onClick={() => likeC(c.id)} className={`px-3 py-1 rounded-lg border text-sm ${c.is_liked ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-gray-50 border-gray-200 hover:border-gray-300"}`}>
                ❤️ {c.likes_count}
              </button>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
