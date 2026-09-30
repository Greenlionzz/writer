"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookCopy,
  Clapperboard,
  Feather,
  HardDrive,
  Layers,
  LayoutDashboard,
  Library,
  Menu,
  NotebookPen,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ElementType> = {
  novel: NotebookPen,
  trilogy: Library,
  series: Layers,
  stories: BookCopy,
  screenplay: Clapperboard,
};

export type SidebarProject = { id: string; title: string; type: string };

function SidebarContent({
  projects,
  onNavigate,
}: {
  projects: SidebarProject[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const navLink = (
    href: string,
    label: string,
    Icon: React.ElementType,
    exact = true
  ) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-lift text-cream shadow-[inset_2px_0_0_var(--color-brass)]"
            : "text-faded hover:bg-lift/60 hover:text-stone-200"
        )}
      >
        <Icon className={cn("h-4 w-4", active ? "text-brass" : "text-stone-500 group-hover:text-faded")} />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-brass-bright to-brass shadow-[0_6px_20px_-6px_rgba(210,163,92,0.6)]">
          <Feather className="h-4.5 w-4.5 text-ink" strokeWidth={2.2} />
        </div>
        <div>
          <p className="font-display text-lg leading-none font-semibold tracking-tight text-cream">
            Fabula
          </p>
          <p className="mt-0.5 text-[10px] tracking-[0.18em] text-stone-500 uppercase">
            Story Studio
          </p>
        </div>
      </div>

      <nav className="space-y-1 px-3">
        {navLink("/dashboard", "Dashboard", LayoutDashboard)}
        {navLink("/settings", "API Keys & Settings", Settings, false)}
      </nav>

      <div className="mt-7 px-5 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-stone-500 uppercase">
            Your shelves
          </p>
          <Link
            href="/projects/new"
            onClick={onNavigate}
            className="rounded-md p-1 text-faded transition-colors hover:bg-lift hover:text-brass"
            title="New project"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {projects.length === 0 && (
          <p className="px-3 py-2 text-xs text-stone-600 italic">
            No projects yet — start your first story.
          </p>
        )}
        {projects.map((p) => {
          const Icon = TYPE_ICONS[p.type] ?? NotebookPen;
          const active = pathname.startsWith(`/projects/${p.id}`);
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-lift text-cream"
                  : "text-faded hover:bg-lift/60 hover:text-stone-200"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-brass" : "text-stone-600")} />
              <span className="truncate">{p.title}</span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-hairline p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
            <HardDrive className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-stone-200">Local workspace</p>
            <p className="truncate text-[11px] text-stone-500">No account needed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  projects,
  children,
}: {
  projects: SidebarProject[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-hairline bg-panel/90 backdrop-blur lg:block">
        <SidebarContent projects={projects} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-panel/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-faded hover:bg-lift"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Feather className="h-4 w-4 text-brass" />
          <span className="font-display text-lg font-semibold text-cream">Fabula</span>
        </div>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-hairline bg-panel animate-fade-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 rounded-md p-1.5 text-faded hover:bg-lift"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent projects={projects} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
