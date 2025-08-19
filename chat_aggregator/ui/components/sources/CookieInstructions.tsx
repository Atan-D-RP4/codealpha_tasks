"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card.tsx";
import Button from "@/components/ui/Button.tsx";

const platformInstructions = {
  chatgpt: {
    name: "ChatGPT",
    emoji: "🤖",
    domain: "chat.openai.com",
    steps: [
      "Open chat.openai.com in your browser and log in",
      "Open Developer Tools (F12 or right-click → Inspect)",
      "Go to the 'Application' tab (Chrome) or 'Storage' tab (Firefox)",
      "In the left sidebar, expand 'Cookies' and click on 'https://chat.openai.com'",
      "Look for cookies like '_puid', 'cf_clearance', '__Secure-next-auth.session-token'",
      "Copy the cookie data using the format below"
    ],
    importantCookies: ["_puid", "cf_clearance", "__Secure-next-auth.session-token"]
  },
  claude: {
    name: "Claude",
    emoji: "🔮",
    domain: "claude.ai",
    steps: [
      "Open claude.ai in your browser and log in",
      "Open Developer Tools (F12 or right-click → Inspect)",
      "Go to the 'Application' tab (Chrome) or 'Storage' tab (Firefox)",
      "In the left sidebar, expand 'Cookies' and click on 'https://claude.ai'",
      "Look for cookies like 'sessionKey', 'cf_clearance'",
      "Copy the cookie data using the format below"
    ],
    importantCookies: ["sessionKey", "cf_clearance"]
  },
  grok: {
    name: "Grok (X.com)",
    emoji: "⚡",
    domain: "x.com",
    steps: [
      "Open grok.x.com in your browser and log in",
      "Open Developer Tools (F12 or right-click → Inspect)",
      "Go to the 'Application' tab (Chrome) or 'Storage' tab (Firefox)",
      "In the left sidebar, expand 'Cookies' and click on 'https://x.com'",
      "Look for cookies like 'auth_token', 'ct0'",
      "Copy the cookie data using the format below"
    ],
    importantCookies: ["auth_token", "ct0"]
  },
  gemini: {
    name: "Gemini",
    emoji: "💎",
    domain: "gemini.google.com",
    steps: [
      "Open gemini.google.com in your browser and log in",
      "Open Developer Tools (F12 or right-click → Inspect)",
      "Go to the 'Application' tab (Chrome) or 'Storage' tab (Firefox)",
      "In the left sidebar, expand 'Cookies' and click on 'https://gemini.google.com'",
      "Look for cookies like '__Secure-1PSID', '__Secure-1PSIDTS'",
      "Copy the cookie data using the format below"
    ],
    importantCookies: ["__Secure-1PSID", "__Secure-1PSIDTS"]
  }
};

export default function CookieInstructions() {
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof platformInstructions | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const cookieFormat = `[
  {
    "name": "cookie_name",
    "value": "cookie_value",
    "domain": ".example.com",
    "path": "/"
  }
]`;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>How to Get Cookies</CardTitle>
          <Button 
            variant="secondary" 
            onClick={() => setShowInstructions(!showInstructions)}
          >
            {showInstructions ? "Hide Instructions" : "Show Instructions"}
          </Button>
        </div>
      </CardHeader>
      
      {showInstructions && (
        <div className="px-6 pb-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Select Platform:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(platformInstructions).map(([key, platform]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPlatform(key as keyof typeof platformInstructions)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPlatform === key
                      ? "border-primary bg-accent"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="text-2xl mb-2">{platform.emoji}</div>
                  <div className="text-sm font-medium">{platform.name}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedPlatform && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  {platformInstructions[selectedPlatform].emoji} {platformInstructions[selectedPlatform].name} Instructions:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  {platformInstructions[selectedPlatform].steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Important Cookies to Look For:</h4>
                <div className="flex flex-wrap gap-2">
                  {platformInstructions[selectedPlatform].importantCookies.map((cookie) => (
                    <span
                      key={cookie}
                      className="px-3 py-1 bg-muted rounded-full text-sm font-mono"
                    >
                      {cookie}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Cookie Format:</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Copy your cookies in this JSON format:
                </p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {cookieFormat}
                </pre>
              </div>

              <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-300 mb-2">⚠️ Security Note:</h4>
                <p className="text-sm text-yellow-300">
                  Cookies contain sensitive authentication information. Only enter cookies from platforms you trust, 
                  and never share your cookies with others. These cookies will be stored securely and used only 
                  to access your chat history.
                </p>
              </div>

              <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
                <h4 className="font-semibold text-blue-300 mb-2">💡 Pro Tip:</h4>
                <p className="text-sm text-blue-300">
                  You can also use browser extensions like "Cookie Editor" or "EditThisCookie" to export 
                  cookies in JSON format more easily.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}