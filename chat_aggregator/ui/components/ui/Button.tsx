"use client";

import React from "react";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
  success:
    "bg-green-600 text-white hover:bg-green-700",
  danger:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  ghost: "bg-transparent text-muted-foreground hover:bg-accent",
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
}) {
  return (
    <button
      className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
        variants[variant]
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
