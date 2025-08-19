"use client";

import React from "react";

export default function Alert({
  children,
  type = "info",
  className = "",
}: {
  children: React.ReactNode;
  type?: "info" | "success" | "error" | "warning";
  className?: string;
}) {
  const styles: Record<string, string> = {
    info: "bg-blue-900 text-blue-300 border border-blue-700",
    success: "bg-green-900 text-green-300 border border-green-700",
    error: "bg-destructive text-destructive-foreground border border-red-700",
    warning: "bg-yellow-900 text-yellow-300 border border-yellow-700",
  };

  return (
    <div className={`p-3 rounded-lg ${styles[type]} ${className}`}>
      {children}
    </div>
  );
}
