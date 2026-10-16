"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Card, Eyebrow } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function StatusDetailPage() {
  const { model } = useDemo();
  const { status } = model;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/today" className="text-sm text-pine hover:underline">
        ← Today
      </Link>
      <header>
        <Eyebrow>Explainable status</Eyebrow>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="display text-3xl">My Wellness Status</h1>
          <StatusBadge state={status.state} />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          The LLM does not calculate this. Engine {status.engineVersion}. Thresholds are demo calibrations, not clinically validated.
        </p>
      </header>

      <Card>
        <p className="text-sm leading-6">{status.summary}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Composite deviation</dt>
            <dd className="font-medium">{status.composite.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted">Persistence</dt>
            <dd className="font-medium">{status.persistenceDays} days</dd>
          </div>
          <div>
            <dt className="text-muted">Agreeing domains</dt>
            <dd className="font-medium">{status.agreeingDomains}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Drivers</h2>
        <ul className="mt-3 space-y-3">
          {status.drivers.map((driver) => (
            <li key={driver.metricId} className="border-b border-line pb-3 last:border-0">
              <p className="font-medium">{driver.label}</p>
              <p className="text-sm text-ink-soft">{driver.summary}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Domain scores</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {status.domains.map((domain) => (
            <li key={domain.pillar} className="flex justify-between gap-3">
              <span className="capitalize">{domain.pillar}</span>
              <span className="text-ink-soft">
                deviation {domain.deviation.toFixed(2)} · reliability {Math.round(domain.reliability * 100)}%
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted">
          Formula used: DomainDeviation = Σ(wᵢ · rᵢ · pᵢ · f(dᵢ)) / Σ(wᵢ · rᵢ), with dᵢ from a robust rolling baseline (median / MAD). The consumer sees a state, not a 0–100 health score.
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Data quality</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {status.dataQuality.coverageDays} valid days · {status.dataQuality.missingLast7} missing in last 7 · sources {status.dataQuality.sources.join(", ") || "none"}
          {status.dataQuality.recencyHours == null
            ? " · no watch sync recorded yet."
            : ` · about ${Math.round(status.dataQuality.recencyHours)} hours since the last Pulse Watch sync.`}
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          My Baseline is the primary comparison. Peer and general references stay secondary and are shown on each trend.
        </p>
        <Link href="/trends/recovery" className="mt-2 inline-block text-sm text-pine hover:underline">
          See the three reference layers
        </Link>
        <p className="mt-3 text-xs text-muted">{status.clinicalDisclaimer}</p>
      </Card>
    </div>
  );
}
