"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function EntryPage() {
  const router = useRouter();
  const { enterRam, startCustom } = useDemo();

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto grid min-h-dvh max-w-5xl gap-10 px-5 py-10 md:grid-cols-[1.15fr_0.85fr] md:items-center md:px-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">
            HealthTrack 1.0 · interactive demo
          </p>
          <h1 className="display mt-4 max-w-xl text-4xl leading-tight text-ink md:text-5xl">
            Know your normal. Then do one thing about it.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-ink-soft">
            HealthTrack is a personal wellness guide. It learns what is usual
            for one person from sleep, recovery, activity, and occasional labs,
            then names a single low-risk behavior for today.
          </p>
          <p className="mt-4 max-w-lg text-sm leading-6 text-ink-soft">
            It is meant for someone tracking their own wellness, not a clinic
            visit and not an employer report. The product does not diagnose.
            A shift away from your baseline is a pattern to act on, not a
            medical finding.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="px-5 py-2.5"
              onClick={() => {
                enterRam();
                router.push("/today");
              }}
            >
              Open Ram’s Today
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="secondary"
              className="px-5 py-2.5"
              onClick={() => {
                startCustom();
                router.push("/onboarding");
              }}
            >
              Start with an empty profile
            </Button>
          </div>
          <p className="mt-5 max-w-lg text-xs leading-5 text-muted">
            Ram Chen’s sample day is 16 October 2026: about six weeks of
            simulated Oura and Apple Health, two parsed lab reports, and a
            four-day move away from his own range. Pulse Watch can import a
            new evening batch into those same records. Wearables, lab parsing,
            and coach wording are simulated. No account or device is required.
          </p>
        </div>

        <aside className="rounded-3xl bg-pine px-6 py-7 text-surface shadow-[0_20px_50px_rgba(20,36,28,0.12)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-surface/70">
            Ram · 16 October · sample
          </p>
          <p className="display mt-3 text-3xl">Shifting</p>
          <p className="mt-2 text-sm leading-6 text-surface/80">
            Sleep and recovery have sat below his usual range for four days.
            The status is calculated from his records. It is not a score and
            not a diagnosis.
          </p>
          <div className="mt-6 rounded-2xl bg-surface px-4 py-4 text-ink">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-one">
              Today’s ONE
            </p>
            <p className="mt-2 text-base font-medium leading-6">
              Get to bed by 10:30 pm tonight, his usual time.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              The post-dinner walk stays as Repeat ONE. His own evenings
              already show a link with next-morning HRV.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
