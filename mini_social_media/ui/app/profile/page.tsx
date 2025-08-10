"use client";

import React from "react";
import Container from "@/components/layout/Container.tsx";
import { useAuth } from "@/components/authContext.tsx";
import Button from "@/components/ui/Button.tsx";
import Input from "@/components/ui/Input.tsx";
import Alert from "@/components/ui/Alert.tsx";
import { getUserPosts, updateProfile } from "@/components/social/api.ts";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = React.useState(user?.display_name || "");
  const [bio, setBio] = React.useState(user?.bio || "");
  const [avatar, setAvatar] = React.useState(user?.avatar_url || "");
  const [message, setMessage] = React.useState<string | null>(null);
  const [posts, setPosts] = React.useState<Awaited<ReturnType<typeof getUserPosts>> | null>(null);

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setBio(user.bio || "");
      setAvatar(user.avatar_url || "");
      getUserPosts(user.id).then(setPosts).catch(() => {});
    }
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ display_name: displayName || undefined, bio: bio || undefined, avatar_url: avatar || undefined });
      setMessage("Profile updated");
      await refreshUser();
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to update");
    }
  };

  if (!user) return null;

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
        {message && <Alert className="mb-4">{message}</Alert>}
        <form onSubmit={save} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-8 grid gap-4">
          <div>
            <label className="block mb-1 font-medium">Display name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1 font-medium">Bio</label>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1 font-medium">Avatar URL</label>
            <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} />
          </div>
          <div className="flex justify-end"><Button type="submit">Save</Button></div>
        </form>

        <h2 className="text-xl font-semibold mb-3">Your Posts</h2>
        <div className="space-y-4">
          {posts?.posts?.length ? posts.posts.map((p) => (
            <article key={p.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <header className="flex items-center justify-between mb-2">
                <div className="font-semibold">{p.user?.display_name || p.user?.username || `User #${p.user_id}`}</div>
                <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</div>
              </header>
              <p className="mb-3 whitespace-pre-wrap">{p.content}</p>
            </article>
          )) : (
            <div className="text-gray-600">No posts yet.</div>
          )}
        </div>
      </Container>
    </div>
  );
}
