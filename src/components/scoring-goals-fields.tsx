"use client";

import { Button, Field, Select, TextInput } from "@/components/ui";
import type { ScoringGoals, TrackerSource } from "@/lib/types";

function sourceValue(value: string): TrackerSource | null {
  return value === "manual" || value === "companion" ? value : null;
}

function positive(value: string): number | null {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function ScoringGoalsFields({
  goals,
  onChange,
  bedtime,
  onBedtime,
  sleepDisplay,
  onSleepDisplay,
}: {
  goals: ScoringGoals;
  onChange: (goals: ScoringGoals) => void;
  bedtime: string;
  onBedtime: (value: string) => void;
  sleepDisplay?: string;
  onSleepDisplay?: (value: string) => void;
}) {
  function patch(partial: Partial<ScoringGoals>) {
    onChange({ ...goals, ...partial });
  }

  const sleepValue = sleepDisplay ?? (goals.sleepHoursGoal == null ? "" : String(goals.sleepHoursGoal));

  return (
    <div className="grid gap-3">
      <Field label="Meals to log each day" hint="Choose 1 to 6. This measures whether meals were logged, not how nutritious they were.">
        <Select
          value={goals.mealTarget == null ? "" : String(goals.mealTarget)}
          onChange={(event) => patch({ mealTarget: event.target.value === "" ? null : Number(event.target.value) })}
        >
          <option value="">Not set</option>
          {[1, 2, 3, 4, 5, 6].map((count) => (
            <option key={count} value={count}>{count}</option>
          ))}
        </Select>
      </Field>
      <Field label="Daily calorie target" hint="Calorie progress waits until the meal target is met and every counted meal includes calories.">
        <TextInput
          inputMode="numeric"
          value={goals.calorieGoal ?? ""}
          onChange={(event) => patch({ calorieGoal: positive(event.target.value) })}
        />
      </Field>
      <Field label="Sleep duration goal (hours)" hint="Eight hours is a starting suggestion. It is saved when you choose it.">
        <div className="flex gap-2">
          <TextInput
            inputMode="decimal"
            value={sleepValue}
            onChange={(event) => {
              if (onSleepDisplay) onSleepDisplay(event.target.value);
              else patch({ sleepHoursGoal: positive(event.target.value) });
            }}
          />
          <Button
            variant="secondary"
            onClick={() => {
              if (onSleepDisplay) onSleepDisplay("8");
              else patch({ sleepHoursGoal: 8 });
            }}
          >
            Use 8 hours
          </Button>
        </div>
      </Field>
      <Field label="Target bedtime" hint="Sleep consistency compares recorded start times with this bedtime.">
        <TextInput type="time" value={bedtime} onChange={(event) => onBedtime(event.target.value)} />
      </Field>
      <Field label="Primary activity goal" hint="Choose one. Steps and active minutes are not combined.">
        <Select
          value={goals.activityKind ?? ""}
          onChange={(event) => patch({
            activityKind: event.target.value === "steps" || event.target.value === "active_minutes" ? event.target.value : null,
          })}
        >
          <option value="">Not set</option>
          <option value="steps">Steps</option>
          <option value="active_minutes">Active minutes</option>
        </Select>
      </Field>
      <Field label={goals.activityKind === "steps" ? "Daily step target" : "Daily active-minute target"}>
        <TextInput
          inputMode="numeric"
          value={goals.activityGoal ?? ""}
          onChange={(event) => patch({ activityGoal: positive(event.target.value) })}
        />
      </Field>
      {(["hydration", "sleep", "activity"] as const).map((metric) => (
        <Field key={metric} label={`Preferred ${metric} source`} hint="The other source is used only when the preferred source has no valid record. The two are never added.">
          <Select
            value={goals.sources[metric] ?? ""}
            onChange={(event) => patch({ sources: { ...goals.sources, [metric]: sourceValue(event.target.value) } })}
          >
            <option value="">No preference</option>
            <option value="manual">Manual</option>
            <option value="companion">Companion app</option>
          </Select>
        </Field>
      ))}
    </div>
  );
}
