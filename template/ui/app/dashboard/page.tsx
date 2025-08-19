"use client";

import React from "react";
import Container from "@/components/layout/Container.tsx";
import { useAuth } from "@/components/authContext.tsx";
import Button from "@/components/ui/Button.tsx";
import Input from "@/components/ui/Input.tsx";
import Alert from "@/components/ui/Alert.tsx";
import Link from "next/link";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pageLoading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="py-8">
      <Container>
        <h1 className="text-2xl font-bold mb-6">
          Welcome{user ? `, ${user.username}` : ""}
        </h1>

        {error && <Alert type="error" className="mb-4">{error}</Alert>}
      </Container>
    </div>
  );
}
