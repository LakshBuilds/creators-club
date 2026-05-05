"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

const styles: Record<Variant, string> = {
  primary: "bg-indigo-800 text-white hover:bg-indigo-900",
  secondary: "border border-indigo-200 bg-white text-indigo-950 hover:bg-indigo-50",
  ghost: "text-indigo-900/90 hover:bg-indigo-100/80",
  danger: "bg-red-600 text-white hover:bg-red-700"
};

export function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
