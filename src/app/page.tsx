"use client";

import Link from "next/link";
import { ArrowRight, HeartPulse, LockKeyhole } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function EntryPage() {
  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
        <p className="text-sm font-medium text-muted">HealthTrack</p>
        <h1 className="display mt-3 text-4xl leading-[1.1] text-ink">
          Know your normal. Then do one thing about it.
        </h1>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          HealthTrack keeps a personal profile, stores the measurements a companion app uploads, and suggests one low-risk behavior for today.
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          It is for personal wellness, not a clinic visit and not an employer report. A shift away from your baseline is a pattern to act on, not a diagnosis.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/sign-up">
            <Button className="w-full py-3">
              Create account
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="secondary" className="w-full py-3">
              Sign in
            </Button>
          </Link>
        </div>

        <Card className="mt-8">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <p className="text-sm leading-6 text-ink-soft">
              Your profile and health records are stored on the server for your account. This site does not read Apple Health. The companion mobile app is not available yet, so Today stays empty until that app uploads measurements.
            </p>
          </div>
        </Card>

        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <HeartPulse className="h-4 w-4" aria-hidden />
          <Link href="/privacy" className="underline">
            Privacy notice
          </Link>
        </div>
      </div>
    </div>
  );
}
