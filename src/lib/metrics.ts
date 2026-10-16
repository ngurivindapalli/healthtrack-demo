import { formatHours, formatNumber, minutesToClock } from "@/lib/format";
import type { MetricDefinition, MetricId } from "@/lib/types";

export const DEMO_TODAY = "2026-10-16";
/** Demo clock used for freshness. Ram's last vendor sync is 07:12, so 18:40 is stale. */
export const DEMO_NOW = `${DEMO_TODAY}T18:40:00Z`;
export const FRESHNESS_HOURS = 4;
export const ENGINE_VERSION = "status-engine@0.1-demo";
export const BASELINE_WINDOW_DAYS = 28;
export const RECENT_WINDOW_DAYS = 4;

export const METRICS: Record<MetricId, MetricDefinition> = {
  sleepHours: {
    id: "sleepHours",
    label: "Sleep duration",
    shortLabel: "Sleep",
    unit: "hours",
    pillar: "sleep",
    better: "higher",
    domainWeight: 1,
    format: (value) => formatHours(value),
  },
  sleepEfficiency: {
    id: "sleepEfficiency",
    label: "Sleep efficiency",
    shortLabel: "Efficiency",
    unit: "%",
    pillar: "sleep",
    better: "higher",
    domainWeight: 0.6,
    format: (value) => `${formatNumber(value, 0)}%`,
  },
  bedtimeMinutes: {
    id: "bedtimeMinutes",
    label: "Bedtime",
    shortLabel: "Bedtime",
    unit: "time",
    pillar: "sleep",
    better: "lower",
    domainWeight: 0.7,
    format: (value) => minutesToClock(value),
  },
  rhr: {
    id: "rhr",
    label: "Resting heart rate",
    shortLabel: "RHR",
    unit: "bpm",
    pillar: "recovery",
    better: "lower",
    domainWeight: 1,
    format: (value) => `${formatNumber(value, 0)} bpm`,
  },
  hrv: {
    id: "hrv",
    label: "Heart rate variability",
    shortLabel: "HRV",
    unit: "ms",
    pillar: "recovery",
    better: "higher",
    domainWeight: 1.1,
    format: (value) => `${formatNumber(value, 0)} ms`,
  },
  steps: {
    id: "steps",
    label: "Steps",
    shortLabel: "Steps",
    unit: "steps",
    pillar: "activity",
    better: "higher",
    domainWeight: 0.9,
    format: (value) => Math.round(value).toLocaleString("en-US"),
  },
  activeMinutes: {
    id: "activeMinutes",
    label: "Active minutes",
    shortLabel: "Active",
    unit: "min",
    pillar: "activity",
    better: "higher",
    domainWeight: 0.5,
    format: (value) => `${formatNumber(value, 0)} min`,
  },
  energy: {
    id: "energy",
    label: "Energy",
    shortLabel: "Energy",
    unit: "/10",
    pillar: "recovery",
    better: "higher",
    domainWeight: 0.45,
    format: (value) => `${formatNumber(value, 1)}/10`,
  },
  stress: {
    id: "stress",
    label: "Stress",
    shortLabel: "Stress",
    unit: "/10",
    pillar: "recovery",
    better: "lower",
    domainWeight: 0.45,
    format: (value) => `${formatNumber(value, 1)}/10`,
  },
  lastMealHour: {
    id: "lastMealHour",
    label: "Last meal",
    shortLabel: "Dinner",
    unit: "hour",
    pillar: "nutrition",
    better: "lower",
    domainWeight: 1,
    format: (value) => {
      const h = Math.floor(value);
      const m = Math.round((value - h) * 60);
      const suffix = h >= 12 ? "pm" : "am";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
    },
  },
};

export const METRIC_LIST = Object.values(METRICS);

export const PILLAR_COPY: Record<
  import("@/lib/types").PillarId,
  { title: string; question: string }
> = {
  sleep: { title: "Sleep", question: "Is rest supporting wellness?" },
  recovery: { title: "Recovery", question: "Is overnight recovery near your normal?" },
  nutrition: { title: "Nutrition", question: "Are meal patterns helping recovery?" },
  activity: { title: "Fitness & Activity", question: "Is movement near your usual range?" },
  labs: { title: "Labs", question: "What episodic context do recent labs add?" },
};

export const STATE_COPY: Record<
  import("@/lib/types").WellnessState,
  { label: string; hint: string }
> = {
  thriving: {
    label: "Thriving",
    hint: "Signals are at or better than your personal baseline.",
  },
  stable: {
    label: "Stable",
    hint: "Most signals remain near what is normal for you.",
  },
  shifting: {
    label: "Shifting",
    hint: "Several signals have moved away from your personal baseline.",
  },
  needs_attention: {
    label: "Needs attention",
    hint: "The pattern is further from your baseline, or a safety rule applied.",
  },
};

export const CLINICAL_DISCLAIMER =
  "HealthTrack 1.0 is a general-wellness guide. It does not diagnose, treat, prevent, or detect disease, and it is not a medical device. Nothing here replaces professional care.";
