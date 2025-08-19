"use client";

import React from "react";

export default function Input(
  { className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      className={`w-full p-4 border-2 border-border rounded-xl text-foreground text-base transition-all duration-300 bg-input focus:outline-none focus:border-ring focus:ring-ring/10 ${className}`}
      {...props}
    />
  );
}
