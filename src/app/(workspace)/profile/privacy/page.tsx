"use client";

import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function PrivacyPage() {
  const { state, patchState } = useDemo();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/profile" className="text-sm text-pine hover:underline">
        ← Profile
      </Link>
      <header>
        <Eyebrow>Privacy</Eyebrow>
        <h1 className="display mt-1 text-3xl">Consent and data use</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Production architecture in the blueprint uses Supabase Auth, RLS and audit logs. This demo keeps choices in localStorage on your device.
        </p>
      </header>
      <Card className="space-y-3 text-sm">
        {(
          [
            ["wearables", "Simulated wearable sync"],
            ["labs", "Lab report storage"],
            ["coaching", "Coach explanations"],
            ["productAnalytics", "Product analytics"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={state.consents[key]}
              onChange={(e) =>
                patchState({ consents: { ...state.consents, [key]: e.target.checked } })
              }
            />
            {label}
          </label>
        ))}
      </Card>
      <Card>
        <p className="text-sm leading-6 text-ink-soft">
          HealthTrack 1.0 stays in general-wellness language. Individual-level sharing with employers or providers is out of this demo; those surfaces are later and must be permissioned.
        </p>
      </Card>
    </div>
  );
}
