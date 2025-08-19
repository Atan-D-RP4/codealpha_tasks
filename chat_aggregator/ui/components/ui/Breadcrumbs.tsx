"use client";

import React from "react";
import Link from "next/link";

export default function Breadcrumbs({
  items,
  className = "",
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-sm text-muted-foreground ${className}`}
    >
      <ol className="flex items-center gap-2 flex-wrap">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            {item.href
              ? (
                <Link href={item.href} className="hover:text-primary">
                  {item.label}
                </Link>
              )
              : <span className="text-foreground font-medium">{item.label}</span>}
            {idx < items.length - 1 && <span className="opacity-50">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
