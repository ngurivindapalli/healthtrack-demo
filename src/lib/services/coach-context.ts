import type { AppModel } from "@/lib/engines/view-model";
import { formatHours, minutesToClock } from "@/lib/format";
import { STATE_COPY } from "@/lib/metrics";
import type { DailyObservation, DemoState } from "@/lib/types";

function span(values: number[], digits = 0): string {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return "not recorded";
  const format = (value: number) => (digits === 0 ? String(Math.round(value)) : value.toFixed(digits));
  const low = Math.min(...finite);
  const high = Math.max(...finite);
  return low === high ? format(low) : `${format(low)}–${format(high)}`;
}

function dayList(observations: DailyObservation[], line: (row: DailyObservation) => string): string {
  return observations.map((row) => `${row.date}: ${line(row)}`).join("\n");
}

function topics(question: string) {
  const q = question.toLowerCase();
  return {
    sleep: /sleep|bed|tired|rest|night|wake/.test(q),
    recovery: /hrv|heart|rhr|pulse|recover|energy|stress|fatigue|sore/.test(q),
    activity: /step|walk|exercise|activit|workout|run|move/.test(q),
    meals: /meal|dinner|eat|food|nutrition|calorie/.test(q),
    status: /score|status|wellness|trend|how am i|how'm i/.test(q),
  };
}

/** Compact measurements for one question. Omits name, contact details, medications, and labs. */
export function buildCoachContext(question: string, state: DemoState, model: AppModel): string {
  const observations = model.observations.filter((row) => row.date);
  if (observations.length === 0) {
    return "No daily measurements are stored yet. Do not invent sleep, heart rate, steps, or scores.";
  }
  const latest = observations[observations.length - 1];
  const focus = topics(question);
  const specific = focus.sleep || focus.recovery || focus.activity || focus.meals || focus.status;
  const lines = [
    `Stored measurements from ${observations[0]?.date} through ${latest?.date}. Cite only numbers listed here.`,
    latest
      ? `Latest day ${latest.date}: sleep ${latest.sleepHours == null ? "missing" : formatHours(latest.sleepHours)}, bedtime ${latest.bedtimeMinutes == null ? "missing" : minutesToClock(latest.bedtimeMinutes)}, resting heart rate ${latest.rhr ?? "missing"} bpm, HRV ${latest.hrv ?? "missing"} ms, steps ${latest.steps ?? "missing"}, evening walk ${latest.eveningWalkMinutes ?? 0} min, energy ${latest.energy ?? "missing"}/10, stress ${latest.stress ?? "missing"}/10, last meal ${latest.lastMealHour == null ? "missing" : minutesToClock(latest.lastMealHour * 60)}.`
      : "",
    `Week ranges: sleep ${span(observations.map((row) => row.sleepHours ?? Number.NaN), 1)} h, resting heart rate ${span(observations.map((row) => row.rhr ?? Number.NaN))} bpm, HRV ${span(observations.map((row) => row.hrv ?? Number.NaN))} ms, steps ${span(observations.map((row) => row.steps ?? Number.NaN))}, evening walks ${span(observations.map((row) => row.eveningWalkMinutes ?? Number.NaN))} min, energy ${span(observations.map((row) => row.energy ?? Number.NaN), 1)}, stress ${span(observations.map((row) => row.stress ?? Number.NaN), 1)}.`,
  ];
  if (!specific || focus.sleep) {
    lines.push(
      "Sleep by day:\n" +
        dayList(observations, (row) =>
          `${row.sleepHours == null ? "missing" : formatHours(row.sleepHours)}, bedtime ${row.bedtimeMinutes == null ? "missing" : minutesToClock(row.bedtimeMinutes)}, efficiency ${row.sleepEfficiency ?? "missing"}%`,
        ),
    );
  }
  if (!specific || focus.recovery) {
    lines.push(
      "Recovery by day:\n" +
        dayList(observations, (row) =>
          `resting heart rate ${row.rhr ?? "missing"} bpm, HRV ${row.hrv ?? "missing"} ms, energy ${row.energy ?? "missing"}/10, stress ${row.stress ?? "missing"}/10`,
        ),
    );
  }
  if (!specific || focus.activity) {
    lines.push(
      "Activity by day:\n" +
        dayList(observations, (row) =>
          `steps ${row.steps ?? "missing"}, active minutes ${row.activeMinutes ?? "missing"}, evening walk ${row.eveningWalkMinutes ?? 0} min`,
        ),
    );
  }
  if (!specific || focus.meals) {
    lines.push(
      "Last meal by day:\n" +
        dayList(observations, (row) => (row.lastMealHour == null ? "missing" : minutesToClock(row.lastMealHour * 60))),
    );
  }
  if (!specific || focus.status) {
    const status = model.status;
    lines.push(
      `Wellness status label: ${STATE_COPY[status.state].label}. Baseline confidence: ${status.confidence}. Seven-day direction: ${status.direction7d}. This label is not a diagnosis.`,
    );
    const associations = model.associations
      .map((item) => item.summary)
      .filter(Boolean)
      .slice(0, 3);
    if (associations.length > 0) {
      lines.push(`Stored associations, not causes:\n${associations.join("\n")}`);
    }
  }
  if (state.context.illness) {
    lines.push("The person flagged illness. Encourage professional care and do not push a performance goal.");
  }
  return lines.filter(Boolean).join("\n\n");
}
