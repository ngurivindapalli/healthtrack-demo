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
  const { state, ready } = useDemo();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!state.onboardingComplete) router.replace("/onboarding");
  }, [ready, state.onboardingComplete, router]);

  return <AppShell>{children}</AppShell>;
}
