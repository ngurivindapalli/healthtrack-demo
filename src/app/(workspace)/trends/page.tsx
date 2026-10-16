"use client";

import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui";
import { Sparkline } from "@/components/sparkline";
import { seriesFor } from "@/lib/engines/view-model";
import { formatSignedPct } from "@/lib/format";
import { METRICS, PILLAR_COPY } from "@/lib/metrics";
import { useDemo } from "@/lib/store";

export default function TrendsPage() {
  const { model } = useDemo();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Eyebrow>Trends</Eyebrow>
        <h1 className="display mt-1 text-3xl">What’s changing?</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Ranked by meaningful deviation from your personal baseline — not from a population average.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PILLAR_COPY) as Array<keyof typeof PILLAR_COPY>).map((id) => (
          <Link
            key={id}
            href={id === "labs" ? "/profile/labs" : `/trends/${id}`}
            className="rounded-full bg-surface px-3 py-1.5 text-sm hairline hover:bg-paper-2"
          >
            {PILLAR_COPY[id].title}
          </Link>
        ))}
      </div>

      <ul className="space-y-3">
        {model.trends.map((item) => {
          const def = METRICS[item.metricId];
          const series = seriesFor(model.observations, item.metricId).map((row) => row.value);
          return (
            <li key={item.metricId}>
              <Link href={`/trends/${item.pillar}`}>
                <Card className="hover:bg-paper">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-sm text-ink-soft">{item.summary}</p>
                      <p className="mt-2 text-xs text-muted">
                        {formatSignedPct(item.percentVsBaseline)} vs your baseline · {item.persistenceDays}d persistence · confidence {Math.round(item.confidence * 100)}%
                        {item.worseForWellness ? " · moving away from your better direction" : ""}
                      </p>
                    </div>
                    <Sparkline
                      values={series.slice(-21)}
                      invert={def.better === "lower"}
                      tone={item.worseForWellness ? "one" : "pine"}
                    />
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <Card>
        <h2 className="text-base font-semibold">Cross-signal associations</h2>
        <ul className="mt-3 space-y-3 text-sm text-ink-soft">
          {model.associations.map((item) => (
            <li key={item.behaviorId}>
              <p>{item.summary}</p>
              <p className="mt-1 text-xs text-muted">
                Confidence {Math.round(item.confidence * 100)}% · n={item.sampleSize} · {item.direction}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
