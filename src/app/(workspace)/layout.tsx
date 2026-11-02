"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useDemo } from "@/lib/store";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state, ready, signedIn } = useDemo();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!signedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!state.onboardingComplete) router.replace("/onboarding");
  }, [ready, signedIn, state.onboardingComplete, router]);

  if (!ready || !signedIn || !state.onboardingComplete) {
    return <p className="px-6 py-10 text-sm text-muted">Loading your account…</p>;
  }

  return <AppShell>{children}</AppShell>;
}
