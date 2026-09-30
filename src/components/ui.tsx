"use client";

import React, { useEffect } from "react";
import { LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- Button ---------------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        {
          primary:
            "bg-gradient-to-b from-brass-bright to-brass text-ink shadow-[0_1px_0_rgba(255,235,200,0.35)_inset,0_8px_24px_-8px_rgba(210,163,92,0.5)] hover:brightness-110",
          outline:
            "border border-hairline bg-card/60 text-stone-200 hover:border-brass/50 hover:bg-lift",
          ghost: "text-faded hover:bg-lift hover:text-cream",
          danger:
            "border border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-950/70 hover:border-red-800",
          subtle: "bg-lift text-stone-300 hover:bg-hairline hover:text-cream",
        }[variant],
        {
          sm: "h-8 px-3 text-xs",
          md: "h-10 px-4 text-sm",
          lg: "h-12 px-6 text-[15px]",
          icon: "h-8 w-8",
        }[size],
        className
      )}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------------- Inputs ---------------- */
export const inputCls =
  "w-full rounded-lg border border-hairline bg-black/30 px-3.5 py-2.5 text-sm text-cream placeholder:text-stone-500 transition-colors focus:border-brass/60 focus:outline-none focus:ring-2 focus:ring-brass/15";

export function Input({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-faded uppercase">
          {label}
        </span>
      )}
      <input className={cn(inputCls, className)} {...props} />
      {hint && <span className="mt-1.5 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function Textarea({
  label,
  hint,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-faded uppercase">
          {label}
        </span>
      )}
      <textarea className={cn(inputCls, "min-h-24 resize-y leading-relaxed", className)} {...props} />
      {hint && <span className="mt-1.5 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-faded uppercase">
          {label}
        </span>
      )}
      <select
        className={cn(inputCls, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a89c88%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-size-[12px] bg-position-[right_0.8rem_center] bg-no-repeat pr-9", className)}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

/* ---------------- Badge ---------------- */
const badgeTones: Record<string, string> = {
  brass: "border-brass/30 bg-brass/10 text-brass-bright",
  violet: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  sky: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  stone: "border-hairline bg-lift text-faded",
  red: "border-red-800/60 bg-red-950/50 text-red-300",
};

export function Badge({
  tone = "stone",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Spinner ---------------- */
export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-5 w-5 animate-spin text-brass", className)} />;
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-7 w-7" />
      <p className="text-sm text-faded">{label}</p>
    </div>
  );
}

/* ---------------- Dialog ---------------- */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          "grain relative w-full rounded-2xl border border-hairline bg-panel p-6 shadow-2xl shadow-black/60 animate-fade-up",
          wide ? "max-w-2xl" : "max-w-md"
        )}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-md p-1 text-faded transition-colors hover:bg-lift hover:text-cream"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="font-display text-xl font-semibold text-cream">{title}</h3>
        {description && <p className="mt-1 text-sm text-faded">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-stone-300">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-panel/40 px-8 py-16 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-hairline bg-card text-brass">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-cream">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-faded">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------- Progress ---------------- */
export function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-lift", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brass-deep via-brass to-brass-bright transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}
