"use client";

import { Check, Eye, Footprints, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import {
  buildInsightBrief,
  hasInsightMeasurements,
  insightFingerprint,
  insightsPaused,
  matchInsightCache,
  refreshCoolingDown,
  shareInsightRequest,
  type DailyInsight,
  type InsightCache,
} from "@/lib/services/daily-insights";
import { useDemo } from "@/lib/store";

const CACHE_KEY = "healthtrack-daily-insight";
const MISSING = "Add a few health measurements to get personalized daily insights.";
const LOADING = "Looking at your latest wellness data...";
const UNAVAILABLE = "Daily insights are temporarily unavailable. Your health dashboard is still available.";

function readCache(): InsightCache | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CACHE_KEY) ?? "") as InsightCache;
    if (!parsed?.fingerprint || !parsed.date || !parsed.insight) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache: InsightCache) {
  window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function DailyInsightsCard() {
  const { state, model } = useDemo();
  const observations = model.observations;
  const date = state.dataAsOf;
  const fingerprint = insightFingerprint(observations);
  const paused = insightsPaused(model.status.safety);
  const ready = hasInsightMeasurements(observations);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [generatedAt, setGeneratedAt] = useState(0);

  useEffect(() => {
    if (!ready || paused) return;
    let cancelled = false;
    const cachedEntry = readCache();
    const cached = matchInsightCache(cachedEntry, fingerprint, date);
    const apply = (next: DailyInsight | null, at: number) => {
      if (cancelled) return;
      setGeneratedAt(at);
      if (!next) {
        setPhase("unavailable");
        return;
      }
      setInsight(next);
      setPhase("ready");
    };
    if (cached) {
      queueMicrotask(() => apply(cached, cachedEntry?.at ?? 0));
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => {
      if (!cancelled) setPhase("loading");
    });
    const brief = buildInsightBrief(observations, model.status, date);
    void shareInsightRequest(`${date}:${fingerprint}`, async () => {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { insight?: DailyInsight };
      return body.insight ?? null;
    }).then((next) => {
      if (next) writeCache({ fingerprint, date, insight: next, at: Date.now() });
      apply(next, Date.now());
    }).catch(() => {
      apply(null, Date.now());
    });
    return () => {
      cancelled = true;
    };
  }, [ready, paused, fingerprint, date, observations, model.status]);

  async function refresh() {
    if (!ready || paused || phase === "loading" || refreshCoolingDown(generatedAt, Date.now())) return;
    setPhase("loading");
    const brief = buildInsightBrief(observations, model.status, date);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      if (!response.ok) {
        setGeneratedAt(Date.now());
        setPhase(insight ? "ready" : "unavailable");
        return;
      }
      const body = (await response.json()) as { insight?: DailyInsight };
      if (!body.insight) {
        setGeneratedAt(Date.now());
        setPhase(insight ? "ready" : "unavailable");
        return;
      }
      const at = Date.now();
      writeCache({ fingerprint, date, insight: body.insight, at });
      setInsight(body.insight);
      setGeneratedAt(at);
      setPhase("ready");
    } catch {
      setGeneratedAt(Date.now());
      setPhase(insight ? "ready" : "unavailable");
    }
  }

  const sections = insight
    ? [
        { icon: Sparkles, title: "Overall wellness", text: insight.overall },
        { icon: Check, title: "What's going well", text: insight.goingWell },
        { icon: Eye, title: "What to pay attention to", text: insight.attention },
        { icon: Footprints, title: "One thing to try today", text: insight.tryToday },
      ]
    : [];

  return (
    <Card>
      <details open>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
          <span className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-muted" aria-hidden />
            Your Daily Wellness Insights
          </span>
          {ready && !paused ? (
            <button
              type="button"
              className="shrink-0 text-xs text-muted hover:text-ink disabled:opacity-50"
              onClick={(event) => {
                event.preventDefault();
                void refresh();
              }}
              disabled={phase === "loading"}
            >
              Refresh insights
            </button>
          ) : null}
        </summary>
        <div className="mt-3 space-y-3 text-sm leading-6 text-ink-soft">
          {paused ? <p>{model.status.safety.reason}</p> : null}
          {!paused && !ready ? <p>{MISSING}</p> : null}
          {!paused && ready && !insight && phase !== "unavailable" ? <p>{LOADING}</p> : null}
          {!paused && ready && phase === "unavailable" && !insight ? <p>{UNAVAILABLE}</p> : null}
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <section.icon className="h-3.5 w-3.5 text-muted" aria-hidden />
                {section.title}
              </h3>
              <p className="mt-1">{section.text}</p>
            </section>
          ))}
        </div>
      </details>
    </Card>
  );
}
