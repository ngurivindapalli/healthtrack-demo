"use client";

import Link from "next/link";
import { Check, ChevronRight, Smartphone } from "lucide-react";
import { DataFreshnessBar } from "@/components/data-freshness";
import { WellnessPanel } from "@/components/wellness-panel";
import { DeclinePrompt } from "@/components/decline-prompt";
import { StatusBadge } from "@/components/status-badge";
import { Sparkline } from "@/components/sparkline";
import { Button, Card, Eyebrow } from "@/components/ui";
import { seriesFor } from "@/lib/engines/view-model";
import { formatHours, greetingForName } from "@/lib/format";
import { METRICS, STATE_COPY } from "@/lib/metrics";
import { useDemo } from "@/lib/store";
import type { MetricId, PillarId } from "@/lib/types";

const PILLAR_TONE: Record<PillarId, "sleep" | "heart" | "exercise" | "move" | "mind"> = {
  sleep: "sleep",
  recovery: "heart",
  nutrition: "exercise",
  activity: "move",
  labs: "mind",
};

export default function TodayPage() {
  const { state, model, setCommitment, setCheckIn, logAdherence, setContext } = useDemo();
  const { status, todayOne, repeatOne, pillars, observations, coldStart } = model;
  const name = state.profile.displayName || "there";
  const decision = state.todayCommitment?.decision ?? "pending";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Eyebrow>Today</Eyebrow>
        <h1 className="display mt-1 text-3xl">{greetingForName(name)}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          What is usual for you, and the one useful thing to do about it.
        </p>
        {state.profile.goals.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {state.profile.goals.map((goal) => (
              <li key={goal} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-soft hairline">
                {goal}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <WellnessPanel />

      <DataFreshnessBar />

      {observations.length === 0 ? (
        <Card>
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-sleep" aria-hidden />
            <div>
              <h2 className="text-base font-semibold">No measurements yet</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Sleep, heart rate, steps, and activity stay blank until the companion app uploads them. HealthTrack does not fill the gaps with zeros or sample readings.
              </p>
              <Link href="/profile/devices" className="mt-3 inline-flex text-sm font-semibold text-pine hover:underline">
                Set up the companion app
              </Link>
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["Sleep", "var(--sleep)"],
              ["Heart", "var(--heart)"],
              ["Activity", "var(--move)"],
              ["Exercise", "var(--exercise)"],
            ].map(([label, color]) => (
              <li key={label} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
                  {label}
                </span>
                <span className="text-muted">Unavailable</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {observations.length > 0 && coldStart ? (
        <Card className="bg-one-soft">
          <Eyebrow>Still learning</Eyebrow>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Baseline confidence is {status.confidence}. There is not enough stored history yet to compare against your own range. Connect the companion app when it is available, or keep checking in. Missing measurements stay blank rather than zero.
          </p>
        </Card>
      ) : null}

      {status.safety.reason ? (
        <Card className="bg-[var(--attention-soft)]">
          <Eyebrow>Safety rule</Eyebrow>
          <p className="mt-2 text-sm leading-6">{status.safety.reason}</p>
        </Card>
      ) : null}

      {observations.length > 0 ? <>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>My Wellness Status</Eyebrow>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusBadge state={status.state} />
              <span className="text-sm text-ink-soft">
                7-day direction {status.direction7d === "down" ? "lower" : status.direction7d === "up" ? "higher" : "steady"}
              </span>
              <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-soft">
                {status.confidence} baseline
              </span>
            </div>
          </div>
          <Link href="/today/status" className="text-sm font-medium text-pine hover:underline">
            Why this status
          </Link>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink-soft">{status.summary}</p>
        <p className="mt-3 text-xs text-muted">{STATE_COPY[status.state].hint} Color is not the only cue — the state name is always shown.</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {pillars.map((pillar) => {
          const metric = (pillar.snapshots[0]?.metricId ?? "sleepHours") as MetricId;
          const series = seriesFor(observations, metric).map((item) => item.value);
          return (
            <Link key={pillar.id} href={pillar.id === "labs" ? "/profile/labs" : `/trends/${pillar.id}`}>
              <Card className="h-full hover:bg-paper">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: `var(--${PILLAR_TONE[pillar.id]})` }}
                        aria-hidden
                      />
                      {pillar.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">{pillar.directionLabel}</p>
                  </div>
                  {pillar.id !== "labs" ? (
                    <Sparkline
                      values={series.slice(-14)}
                      invert={metric === "rhr" || metric === "stress" || metric === "lastMealHour"}
                      tone={PILLAR_TONE[pillar.id]}
                    />
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-5 text-ink-soft">{pillar.summary}</p>
                <p className="mt-2 flex items-center text-xs font-medium text-pine">
                  Explanation <ChevronRight className="h-3 w-3" />
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
      </> : null}

      {todayOne ? (
        <Card className="bg-one-soft">
          <div className="flex items-start justify-between gap-3">
            <Eyebrow>Today’s ONE</Eyebrow>
            <Link href="/today/one" className="text-xs font-medium text-one-ink hover:underline">
              Why this?
            </Link>
          </div>
          <h2 className="mt-3 text-xl font-semibold leading-7 text-ink">
            {todayOne.candidate.instruction}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{todayOne.why}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {decision === "completed" ? (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-pine">
                <Check className="h-4 w-4" /> Marked done for {model.asOf}
              </p>
            ) : (
              <>
                <Button variant="one" onClick={() => setCommitment("accepted")}>
                  I’ll do this
                </Button>
                <Button variant="primary" onClick={() => setCommitment("completed")}>
                  Mark done
                </Button>
                <Button variant="secondary" onClick={() => setCommitment("snoozed", { reason: "Not feasible tonight" })}>
                  Snooze
                </Button>
                <DeclinePrompt
                  key={todayOne.candidate.id}
                  onDecline={(reason) => setCommitment("declined", { reason })}
                />
                <Link href="/today/one" className="inline-flex items-center text-sm font-medium text-one-ink">
                  Replace
                </Link>
              </>
            )}
          </div>
          {decision !== "pending" && decision !== "completed" ? (
            <p className="mt-3 text-xs text-ink-soft">
              Logged as {decision}. Ranking will avoid this behavior while it stays on your account.
            </p>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Eyebrow>Today’s ONE</Eyebrow>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            No behavior is recommended until stored measurements can support it. Saved goals, including Recovery, affect ranking after data arrives.
          </p>
        </Card>
      )}

      {repeatOne ? (
        <Card>
          <Eyebrow>Repeat ONE</Eyebrow>
          <h2 className="mt-2 text-lg font-semibold">{repeatOne.candidate.instruction}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{repeatOne.evidenceNote}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => logAdherence(repeatOne.candidate.id, "completed")}>
              I did this too
            </Button>
            <Link href={`/progress/${repeatOne.candidate.id}`} className="text-sm font-medium text-pine hover:underline">
              Evidence
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <Eyebrow>Repeat ONE</Eyebrow>
          <p className="mt-2 text-sm text-ink-soft">
            Hidden until a behavior has enough repeated personal observations. That is working as designed.
          </p>
        </Card>
      )}

      <Card>
        <Eyebrow>Context flags</Eyebrow>
        <p className="mt-1 text-xs text-muted">These change ranking and can suppress Today’s ONE. They are self-report, not diagnoses.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {(
            [
              ["travel", "Travel"],
              ["illness", "Illness"],
              ["unusualSchedule", "Unusual schedule"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.context[key]}
                onChange={(e) => setContext({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <Eyebrow>Today’s check-in</Eyebrow>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Energy {state.todayEnergy?.toFixed(1) ?? "—" }/10
            <input
              type="range"
              min={1}
              max={10}
              step={0.1}
              value={state.todayEnergy ?? 5}
              onChange={(e) => setCheckIn(Number(e.target.value), state.todayStress ?? 5)}
              className="mt-2 w-full"
            />
          </label>
          <label className="text-sm">
            Stress {state.todayStress?.toFixed(1) ?? "—"}/10
            <input
              type="range"
              min={1}
              max={10}
              step={0.1}
              value={state.todayStress ?? 5}
              onChange={(e) => setCheckIn(state.todayEnergy ?? 5, Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </div>
        {status.domains.find((d) => d.pillar === "sleep")?.drivers[0]?.recentMean != null ? (
          <p className="mt-3 text-xs text-muted">
            Sleep last night{" "}
            {formatHours(
              status.domains.find((d) => d.pillar === "sleep")?.drivers.find((s) => s.metricId === "sleepHours")?.latest ??
                0,
            )}
            . Baseline {METRICS.sleepHours.format(
              status.domains.find((d) => d.pillar === "sleep")?.drivers.find((s) => s.metricId === "sleepHours")?.baseline?.median ??
                0,
            )}
            .
          </p>
        ) : null}
      </Card>
    </div>
  );
}
