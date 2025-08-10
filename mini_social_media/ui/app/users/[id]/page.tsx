"use client";

import React from "react";
import Container from "@/components/layout/Container.tsx";
import Button from "@/components/ui/Button.tsx";
import { getFollowers, getFollowing, getUserPosts, getUserProfile, toggleFollow } from "@/components/social/api.ts";
import { useParams } from "next/navigation";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const [profile, setProfile] = React.useState<Awaited<ReturnType<typeof getUserProfile>> | null>(null);
  const [posts, setPosts] = React.useState<Awaited<ReturnType<typeof getUserPosts>> | null>(null);
  const [followers, setFollowers] = React.useState<Awaited<ReturnType<typeof getFollowers>> | null>(null);
  const [following, setFollowing] = React.useState<Awaited<ReturnType<typeof getFollowing>> | null>(null);

  const load = React.useCallback(async () => {
    const [p, ps, fol, fing] = await Promise.all([
      getUserProfile(userId),
      getUserPosts(userId),
      getFollowers(userId),
      getFollowing(userId),
    ]);
    setProfile(p); setPosts(ps); setFollowers(fol); setFollowing(fing);
  }, [userId]);

  React.useEffect(() => { if (!Number.isNaN(userId)) load(); }, [userId, load]);

  if (!profile) return null;

  const follow = async () => {
    await toggleFollow(userId);
    await load();
  };

  return (
    <div className="py-8">
      <Container>
        <div className="flex items-start gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden">
            {profile.avatar_url && <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            {profile.bio && <p className="text-gray-600">{profile.bio}</p>}
            <div className="text-sm text-gray-600 mt-2">{profile.followers_count} followers · {profile.following_count} following · {profile.posts_count} posts</div>
          </div>
          {!profile.is_own_profile && (
            <Button onClick={follow}>{profile.is_following ? "Unfollow" : "Follow"}</Button>
          )}
        </div>

        <h2 className="text-xl font-semibold mb-3">Posts</h2>
        <div className="space-y-4 mb-8">
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

        <div className="grid md:grid-cols-2 gap-6">
          <section>
            <h3 className="font-semibold mb-2">Followers</h3>
            <ul className="space-y-2">
              {followers?.users?.map(u => (
                <li key={u.id} className="bg-white rounded-lg p-3 border">
                  {u.display_name || u.username}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-2">Following</h3>
            <ul className="space-y-2">
              {following?.users?.map(u => (
                <li key={u.id} className="bg-white rounded-lg p-3 border">
                  {u.display_name || u.username}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Container>
    </div>
  );
}
