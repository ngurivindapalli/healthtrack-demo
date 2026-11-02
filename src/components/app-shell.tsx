"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  CalendarCheck2,
  CircleUserRound,
  LineChart,
  MessageSquareText,
  RotateCcw,
  Watch,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatLongDate } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { Button } from "@/components/ui";

const NAV = [
  { href: "/today", label: "Today", icon: CalendarCheck2, question: "What matters now?" },
  { href: "/trends", label: "Trends", icon: LineChart, question: "What is changing?" },
  { href: "/progress", label: "Progress", icon: Activity, question: "What appears to work?" },
  { href: "/profile", label: "Profile", icon: CircleUserRound, question: "Who am I?" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, model, resetDemo } = useDemo();

  return (
    <div className="min-h-full bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-pine focus:px-4 focus:py-2 focus:text-surface"
      >
        Skip to content
      </a>
      <div className="mx-auto flex min-h-full max-w-6xl">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
          <Link href="/today" className="px-2">
            <p className="display text-xl tracking-tight text-ink">HealthTrack</p>
            <p className="mt-1 text-xs text-muted">Personal wellness</p>
          </Link>
          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    active ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] hairline" : "text-ink-soft hover:bg-surface/70 hover:text-ink",
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-[11px] text-muted">{item.question}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <Link
            href="/profile/devices"
            className={cn(
              "mb-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
              pathname.startsWith("/profile/devices")
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] hairline"
                : "text-ink-soft hover:bg-surface/70 hover:text-ink",
            )}
          >
            <Watch className="h-4 w-4" aria-hidden />
            Devices
          </Link>
          <Link
            href="/coach"
            className="mb-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm font-medium text-ink hairline hover:bg-paper-2"
          >
            <MessageSquareText className="h-4 w-4" aria-hidden />
            Ask Health Coach
          </Link>
          <p className="px-2 text-[11px] leading-4 text-muted">
            {formatLongDate(model.asOf)}. {state.profile.displayName || "Guest"}.
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-28 md:pb-0">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-8">
            <div className="min-w-0">
              <p className="display text-lg text-ink md:hidden">HealthTrack</p>
              <p className="truncate text-xs text-muted">{formatLongDate(model.asOf)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="hidden sm:inline-flex"
                onClick={() => {
                  void resetDemo().then(() => router.push("/"));
                }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Sign out
              </Button>
              <Link
                href="/profile/devices"
                className="inline-flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm font-medium text-ink hairline md:hidden"
              >
                <Watch className="h-4 w-4" aria-hidden />
                Devices
              </Link>
              <Link
                href="/coach"
                className="inline-flex items-center gap-2 rounded-xl bg-pine px-3 py-2 text-sm font-medium text-surface hover:bg-pine-2 md:hidden"
              >
                <MessageSquareText className="h-4 w-4" aria-hidden />
                Coach
              </Link>
            </div>
          </header>
          <div className="border-b border-line bg-surface px-4 py-2 text-xs text-ink-soft md:px-8">
            Health guidance from your stored measurements. This site does not read Apple Health directly, and it does not diagnose.
          </div>
          <main id="main" className="flex-1 px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Mobile"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px]",
                    active ? "font-semibold text-ink" : "text-muted",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
