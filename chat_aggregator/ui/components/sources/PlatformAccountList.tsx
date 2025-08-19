"use client";

import React from "react";
import Button from "@/components/ui/Button.tsx";
import Badge from "@/components/ui/Badge.tsx";

interface PlatformAccount {
  id: number;
  platform: "chatgpt" | "claude" | "grok" | "gemini";
  account_name: string;
  created_at: string;
}

interface PlatformAccountListProps {
  accounts: PlatformAccount[];
  loading: boolean;
  onEdit: (account: PlatformAccount) => void;
  onDelete: (accountId: number) => void;
}

const platformInfo = {
  chatgpt: { emoji: "🤖", name: "ChatGPT", color: "green" as const },
  claude: { emoji: "🔮", name: "Claude", color: "purple" as const },
  grok: { emoji: "⚡", name: "Grok", color: "blue" as const },
  gemini: { emoji: "💎", name: "Gemini", color: "yellow" as const },
};

export default function PlatformAccountList({ 
  accounts, 
  loading, 
  onEdit, 
  onDelete 
}: PlatformAccountListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading accounts...</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🔗</div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          No Platform Accounts
        </h3>
        <p className="text-muted-foreground mb-4">
          Add your first platform account to start aggregating chats
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => {
        const platform = platformInfo[account.platform];
        
        return (
          <div
            key={account.id}
                      className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="text-2xl">{platform.emoji}</div>
              <div>
                <h3 className="font-medium text-foreground">
                  {account.account_name}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge color={platform.color}>
                    {platform.name}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Added {formatDate(account.created_at)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                onClick={() => onEdit(account)}
                className="text-sm"
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => onDelete(account.id)}
                className="text-sm"
              >
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}