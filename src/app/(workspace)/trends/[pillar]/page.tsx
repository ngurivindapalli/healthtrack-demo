"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { TrendChart } from "@/components/sparkline";
import { Card, Eyebrow } from "@/components/ui";
import { seriesFor } from "@/lib/engines/view-model";
import { METRICS, PILLAR_COPY } from "@/lib/metrics";
import { useDemo } from "@/lib/store";
import type { PillarId } from "@/lib/types";

export default function PillarTrendPage() {
  const params = useParams<{ pillar: string }>();
  const { model } = useDemo();
  const pillar = params.pillar as PillarId;
  const copy = PILLAR_COPY[pillar];
  const view = model.pillars.find((item) => item.id === pillar);

  if (!copy) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Unknown pillar.</p>
        <Link href="/trends" className="text-sm text-pine">
          Back to trends
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/trends" className="text-sm text-pine hover:underline">
        ← What’s changing
      </Link>
      <header>
        <Eyebrow>Supporting lens</Eyebrow>
        <h1 className="display mt-1 text-3xl">{copy.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{copy.question}</p>
        <p className="mt-1 text-sm">{view?.directionLabel}. {view?.summary}</p>
      </header>

      {view?.snapshots.map((snap) => {
        const def = METRICS[snap.metricId];
        const series = seriesFor(model.observations, snap.metricId);
        return (
          <Card key={snap.metricId}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">{def.label}</h2>
              <p className="text-sm text-ink-soft">
                {snap.recentMean != null ? def.format(snap.recentMean) : "—"} vs{" "}
                {snap.baseline ? def.format(snap.baseline.median) : "no baseline"}
              </p>
            </div>
            <div className="mt-3">
              <TrendChart
                values={series}
                baseline={snap.baseline?.median ?? null}
                band={snap.baseline ? snap.baseline.mad * 1.4826 : null}
                label={def.label}
                invert={def.better === "lower"}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Green band = personal baseline ± robust scale. Peach band = last 4 days. Primary comparison is My Baseline.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-soft sm:grid-cols-3">
              <div>
                <dt className="text-muted">My baseline</dt>
                <dd>{snap.baseline ? def.format(snap.baseline.median) : "Building"}</dd>
              </div>
              <div>
                <dt className="text-muted">Peer reference</dt>
                <dd>{snap.peerReference != null ? def.format(snap.peerReference) : "Not applied"}</dd>
              </div>
              <div>
                <dt className="text-muted">General</dt>
                <dd>{snap.generalReference ?? "Secondary only"}</dd>
              </div>
            </dl>
          </Card>
        );
      })}

      {pillar === "labs" ? (
        <Card>
          <p className="text-sm">
            Lab trends live with provenance on the labs page.
          </p>
          <Link href="/profile/labs" className="mt-2 inline-block text-sm text-pine hover:underline">
            Open parsed labs
          </Link>
        </Card>
      ) : null}

      {view?.snapshots.length === 0 && pillar !== "labs" ? (
        <Card>
          <p className="text-sm text-ink-soft">
            Not enough wearable days yet. Connect a sample source or enter as Ram.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
