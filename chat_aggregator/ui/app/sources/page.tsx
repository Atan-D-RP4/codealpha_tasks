"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/layout/Container.tsx";
import { useAuth } from "@/components/authContext.tsx";
import Button from "@/components/ui/Button.tsx";
import Alert from "@/components/ui/Alert.tsx";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card.tsx";
import CookieInstructions from "@/components/sources/CookieInstructions.tsx";
import PlatformAccountForm from "@/components/sources/PlatformAccountForm.tsx";
import PlatformAccountList from "@/components/sources/PlatformAccountList.tsx";

interface PlatformAccount {
  id: number;
  platform: "chatgpt" | "claude" | "grok" | "gemini";
  account_name: string;
  created_at: string;
}

export default function SourcesPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PlatformAccount | null>(null);

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/platform-accounts", {
        credentials: "include",
      });
      const result = await response.json();

      if (result.success) {
        setAccounts(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to load platform accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountAdded = () => {
    setShowAddForm(false);
    loadAccounts();
  };

  const handleAccountUpdated = () => {
    setEditingAccount(null);
    loadAccounts();
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm("Are you sure you want to delete this platform account?")) {
      return;
    }

    try {
      const response = await fetch(`/api/platform-accounts/${accountId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        loadAccounts();
      } else {
        const result = await response.json();
        setError(result.error || "Failed to delete account");
      }
    } catch (err) {
      setError("Failed to delete account");
    }
  };

  if (!user) {
    return (
      <div className="py-8">
        <Container>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Platform Sources
            </h1>
            <p className="text-gray-600 mb-6">
              Please log in to manage your platform accounts.
            </p>
            <Button onClick={() => window.location.href = "/login"}>
              Log In
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Container>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Platform Sources
            </h1>
            <p className="text-gray-600 mt-1">
              Connect your AI chat platforms to aggregate conversations
            </p>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm || editingAccount}
          >
            + Add Platform
          </Button>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Cookie Instructions */}
        <CookieInstructions />

        {/* Add/Edit Form */}
        {(showAddForm || editingAccount) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingAccount ? "Edit Platform Account" : "Add Platform Account"}
              </CardTitle>
            </CardHeader>
            <PlatformAccountForm
              account={editingAccount}
              onSuccess={editingAccount ? handleAccountUpdated : handleAccountAdded}
              onCancel={() => {
                setShowAddForm(false);
                setEditingAccount(null);
              }}
            />
          </Card>
        )}

        {/* Platform Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Platform Accounts</CardTitle>
          </CardHeader>
          <PlatformAccountList
            accounts={accounts}
            loading={loading}
            onEdit={setEditingAccount}
            onDelete={handleDeleteAccount}
          />
        </Card>
      </Container>
    </div>
  );
}