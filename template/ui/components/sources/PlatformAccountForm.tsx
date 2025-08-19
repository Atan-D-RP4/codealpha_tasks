"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button.tsx";
import Input from "@/components/ui/Input.tsx";
import Alert from "@/components/ui/Alert.tsx";

interface PlatformAccount {
  id: number;
  platform: "chatgpt" | "claude" | "grok" | "gemini";
  account_name: string;
  created_at: string;
}

interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

interface PlatformAccountFormProps {
  account?: PlatformAccount | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const platforms = [
  { value: "chatgpt", label: "ChatGPT", emoji: "🤖" },
  { value: "claude", label: "Claude", emoji: "🔮" },
  { value: "grok", label: "Grok", emoji: "⚡" },
  { value: "gemini", label: "Gemini", emoji: "💎" },
];

export default function PlatformAccountForm({ account, onSuccess, onCancel }: PlatformAccountFormProps) {
  const [platform, setPlatform] = useState(account?.platform || "chatgpt");
  const [accountName, setAccountName] = useState(account?.account_name || "");
  const [cookiesText, setCookiesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCookies = (text: string): Cookie[] => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      throw new Error("Not an array");
    } catch {
      // Try to parse as simple key=value format
      const lines = text.split('\n').filter(line => line.trim());
      const cookies: Cookie[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('=')) {
          const [name, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');
          if (name && value) {
            cookies.push({
              name: name.trim(),
              value: value.trim(),
              domain: `.${platforms.find(p => p.value === platform)?.label.toLowerCase()}.com`,
              path: "/"
            });
          }
        }
      }
      
      if (cookies.length === 0) {
        throw new Error("No valid cookies found");
      }
      
      return cookies;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!accountName.trim()) {
        throw new Error("Account name is required");
      }

      if (!cookiesText.trim()) {
        throw new Error("Cookies are required");
      }

      // Parse cookies
      const cookies = parseCookies(cookiesText);

      // Validate cookies
      for (const cookie of cookies) {
        if (!cookie.name || !cookie.value) {
          throw new Error("Each cookie must have a name and value");
        }
      }

      const url = account 
        ? `/api/platform-accounts/${account.id}`
        : "/api/platform-accounts";
      
      const method = account ? "PUT" : "POST";
      
      const body: any = {
        account_name: accountName.trim(),
        cookies
      };
      
      if (!account) {
        body.platform = platform;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to save platform account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCookieTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCookiesText(e.target.value);
    setError(null); // Clear error when user starts typing
  };

  const exampleCookies = `[
  {
    "name": "session_token",
    "value": "your_session_token_here",
    "domain": ".${platforms.find(p => p.value === platform)?.label.toLowerCase()}.com",
    "path": "/"
  },
  {
    "name": "auth_token",
    "value": "your_auth_token_here",
    "domain": ".${platforms.find(p => p.value === platform)?.label.toLowerCase()}.com",
    "path": "/"
  }
]`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert type="error">
          {error}
        </Alert>
      )}

      {!account && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platform
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as any)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {platforms.map((p) => (
              <option key={p.value} value={p.value}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Account Name
        </label>
        <Input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="e.g., Personal ChatGPT, Work Claude"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Give this account a descriptive name to identify it
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cookies
        </label>
        <textarea
          value={cookiesText}
          onChange={handleCookieTextChange}
          placeholder={exampleCookies}
          className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Paste your cookies in JSON format or as simple name=value pairs (one per line)
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : account ? "Update Account" : "Add Account"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}