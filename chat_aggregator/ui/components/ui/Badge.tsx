"use client";

import React from "react";

export default function Badge({
  children,
  color = "gray",
  className = "",
}: {
  children: React.ReactNode;
  color?: "gray" | "yellow" | "blue" | "purple" | "green" | "red";
  className?: string;
}) {
  const colors: Record<string, string> = {
    gray: "bg-muted text-muted-foreground border-border",
    yellow: "bg-yellow-900 text-yellow-300 border-yellow-700",
    blue: "bg-blue-900 text-blue-300 border-blue-700",
    purple: "bg-purple-900 text-purple-300 border-purple-700",
    green: "bg-green-900 text-green-300 border-green-700",
    red: "bg-red-900 text-red-300 border-red-700",
  };

  return (
    <span
      className={`px-3 py-1 text-sm font-medium rounded border ${
        colors[color]
      } ${className}`}
    >
      {children}
    </span>
  );
}
