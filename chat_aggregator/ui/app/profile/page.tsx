"use client";

import React from "react";
import Container from "@/components/layout/Container.tsx";
import { useAuth } from "@/components/authContext.tsx";
import Button from "@/components/ui/Button.tsx";
import Input from "@/components/ui/Input.tsx";
import Alert from "@/components/ui/Alert.tsx";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = React.useState(
    user?.display_name || "",
  );
  const [bio, setBio] = React.useState(user?.bio || "");
  const [avatar, setAvatar] = React.useState(user?.avatar_url || "");
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setBio(user.bio || "");
      setAvatar(user.avatar_url || "");
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
        {message && <Alert className="mb-4">{message}</Alert>}
        <form
          onSubmit={save}
          className="bg-card rounded-xl p-4 border border-border shadow-sm mb-8 grid gap-4"
        >
          <div>
            <label className="block mb-1 text-foreground font-medium">Display name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 text-foreground font-medium">Bio</label>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1 text-foreground font-medium">Avatar URL</label>
            <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Container>
    </div>
  );
}
