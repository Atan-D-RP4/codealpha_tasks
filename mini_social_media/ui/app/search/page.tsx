"use client";

import React from "react";
import Container from "@/components/layout/Container.tsx";
import Input from "@/components/ui/Input.tsx";
import { getMe, searchUsers } from "@/components/social/api.ts";
// Removed unused import of Link

export default function SearchPage() {
  const [q, setQ] = React.useState("");
  const [users, setUsers] = React.useState<
    Awaited<ReturnType<typeof searchUsers>> | null
  >(null);
  const [me, setMe] = React.useState<
    Awaited<ReturnType<typeof getMe>> | null
  >(null);

  React.useEffect(() => {
    const id = setTimeout(async () => {
      if (q.trim().length === 0) {
        setUsers(null);
        return;
      }
      const [u, me] = await Promise.all([
        searchUsers(q.trim()),
        getMe(),
      ]);
      setUsers(u);
      setMe(me);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-2xl font-bold mb-4">Search</h1>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Input
              placeholder="Search users or posts..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-12"
            />
            <button
              onClick={async () => {
                if (q.trim().length === 0) {
                  setUsers(null);
                  return;
                }
                const [u, me] = await Promise.all([
                  searchUsers(q.trim()),
                  getMe(),
                ]);
                setUsers(u);
                setMe(me);
              }}
              className="absolute right-0 top-0 mt-1 mr-1 px-4 py-2 bg-blue-500 text-white rounded-lg"
              type="button"
            >
              Search
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <section>
            <h2 className="font-semibold mb-2">Users</h2>
            <ul className="space-y-2">
              {users?.users?.users?.filter((u) => u.id !== me?.id).map((u) => (
                <li key={u.id} className="bg-white rounded-lg p-3 border">
                  <a
                    href={`/users/${u.id}`}
                    className="text-blue-600"
                  >
                    {u.display_name || u.username}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Container>
    </div>
  );
}
