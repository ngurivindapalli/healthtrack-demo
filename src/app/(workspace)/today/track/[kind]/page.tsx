"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, Eyebrow, Field, TextArea, TextInput } from "@/components/ui";

const COPY = {
  meal: {
    title: "Nutrition",
    lead: "Log meals yourself. Estimated macros stay blank unless you enter them. Nothing here is treated as a verified lab or device measurement.",
  },
  hydration: {
    title: "Hydration",
    lead: "Add the water you drank. The daily target is a preference, not a medical goal.",
  },
  sleep: {
    title: "Sleep",
    lead: "Enter the time you went to sleep and woke up. Duration is calculated. Sleep stages are not invented.",
  },
  workout: {
    title: "Activity",
    lead: "Log a workout with its duration. This is a manual record, separate from any future companion upload.",
  },
  recovery: {
    title: "Recovery",
    lead: "These ratings are how you felt. They are not heart-rate variability or resting heart rate.",
  },
} as const;

type Kind = keyof typeof COPY;

export default function TrackerPage() {
  const params = useParams<{ kind: string }>();
  const kind = params.kind as Kind;
  const meta = COPY[kind];
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [target, setTarget] = useState("2000");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!meta) return;
    const response = await fetch(`/api/v1/me/logs?kind=${kind}`);
    const body = (await response.json()) as { records?: unknown; error?: { message?: string } };
    setLoading(false);
    if (!response.ok) {
      setError(body.error?.message ?? "Could not load records.");
      return;
    }
    setError("");
    if (kind === "hydration" && body.records && !Array.isArray(body.records)) {
      const hydration = body.records as { entries?: Array<Record<string, unknown>>; targetMilliliters?: number };
      setRecords(hydration.entries ?? []);
      setTarget(String(hydration.targetMilliliters ?? 2000));
      return;
    }
    setRecords(Array.isArray(body.records) ? (body.records as Array<Record<string, unknown>>) : []);
  }, [kind, meta]);

  useEffect(() => {
    if (!meta) return;
    void fetch(`/api/v1/me/logs?kind=${kind}`)
      .then(async (response) => {
        const body = (await response.json()) as { records?: unknown; error?: { message?: string } };
        setLoading(false);
        setEditingId(null);
        if (!response.ok) {
          setError(body.error?.message ?? "Could not load records.");
          return;
        }
        if (kind === "hydration" && body.records && !Array.isArray(body.records)) {
          const hydration = body.records as { entries?: Array<Record<string, unknown>>; targetMilliliters?: number };
          setRecords(hydration.entries ?? []);
          setTarget(String(hydration.targetMilliliters ?? 2000));
          return;
        }
        setRecords(Array.isArray(body.records) ? (body.records as Array<Record<string, unknown>>) : []);
      })
      .catch(() => {
        setLoading(false);
        setError("Could not load records.");
      });
  }, [kind, meta]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(editingId ? `/api/v1/me/logs/${editingId}?kind=${kind}` : `/api/v1/me/logs?kind=${kind}`, {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      setError(body.error?.message ?? "Could not save.");
      return;
    }
    setForm({});
    setEditingId(null);
    await load();
  }

  function editRecord(record: Record<string, unknown>) {
    const local = (value: unknown) => {
      const date = new Date(String(value ?? ""));
      if (Number.isNaN(date.getTime())) return "";
      const pad = (part: number) => String(part).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };
    setEditingId(String(record.id));
    setError("");
    setForm({
      loggedOn: String(record.logged_on ?? ""),
      name: String(record.name ?? ""),
      notes: String(record.notes ?? ""),
      calories: record.calories == null ? "" : String(record.calories),
      milliliters: record.milliliters == null ? "" : String(record.milliliters),
      minutes: record.minutes == null ? "" : String(record.minutes),
      energy: record.energy == null ? "" : String(record.energy),
      fatigue: record.fatigue == null ? "" : String(record.fatigue),
      stress: record.stress == null ? "" : String(record.stress),
      soreness: record.soreness == null ? "" : String(record.soreness),
      startTime: local(record.start_time),
      endTime: local(record.end_time),
      startedAt: local(record.started_at),
    });
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    const response = await fetch(`/api/v1/me/logs/${id}?kind=${kind}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete that entry.");
      return;
    }
    await load();
  }

  if (!meta) {
    return <p className="px-6 py-10 text-sm text-muted">That tracker does not exist.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/today" className="text-sm text-pine hover:underline">← Today</Link>
      <header>
        <Eyebrow>Manual tracking</Eyebrow>
        <h1 className="display mt-1 text-3xl">{meta.title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{meta.lead}</p>
      </header>
      <Card>
        <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
          {kind === "meal" ? (
            <>
              <Field label="Date"><TextInput type="date" required value={form.loggedOn ?? ""} onChange={(event) => setForm({ ...form, loggedOn: event.target.value })} /></Field>
              <Field label="Meal"><TextInput required value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Calories (optional)"><TextInput inputMode="decimal" value={form.calories ?? ""} onChange={(event) => setForm({ ...form, calories: event.target.value })} /></Field>
              <Field label="Notes"><TextArea rows={2} value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </>
          ) : null}
          {kind === "hydration" ? (
            <>
              <Field label="Date"><TextInput type="date" required value={form.loggedOn ?? ""} onChange={(event) => setForm({ ...form, loggedOn: event.target.value })} /></Field>
              <Field label="Amount (ml)"><TextInput required inputMode="numeric" value={form.milliliters ?? ""} onChange={(event) => setForm({ ...form, milliliters: event.target.value })} /></Field>
            </>
          ) : null}
          {kind === "sleep" ? (
            <>
              <Field label="Fell asleep"><TextInput type="datetime-local" required value={form.startTime ?? ""} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></Field>
              <Field label="Woke up"><TextInput type="datetime-local" required value={form.endTime ?? ""} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></Field>
              <Field label="Notes"><TextArea rows={2} value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </>
          ) : null}
          {kind === "workout" ? (
            <>
              <Field label="Started"><TextInput type="datetime-local" required value={form.startedAt ?? ""} onChange={(event) => setForm({ ...form, startedAt: event.target.value })} /></Field>
              <Field label="Workout"><TextInput required value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Minutes"><TextInput required inputMode="numeric" value={form.minutes ?? ""} onChange={(event) => setForm({ ...form, minutes: event.target.value })} /></Field>
            </>
          ) : null}
          {kind === "recovery" ? (
            <>
              <Field label="Date"><TextInput type="date" required value={form.loggedOn ?? ""} onChange={(event) => setForm({ ...form, loggedOn: event.target.value })} /></Field>
              <Field label="Energy 0–10"><TextInput inputMode="decimal" value={form.energy ?? ""} onChange={(event) => setForm({ ...form, energy: event.target.value })} /></Field>
              <Field label="Fatigue 0–10"><TextInput inputMode="decimal" value={form.fatigue ?? ""} onChange={(event) => setForm({ ...form, fatigue: event.target.value })} /></Field>
              <Field label="Stress 0–10"><TextInput inputMode="decimal" value={form.stress ?? ""} onChange={(event) => setForm({ ...form, stress: event.target.value })} /></Field>
              <Field label="Soreness 0–10"><TextInput inputMode="decimal" value={form.soreness ?? ""} onChange={(event) => setForm({ ...form, soreness: event.target.value })} /></Field>
              <p className="text-xs text-muted">Soreness is optional. Stress is stored separately and is not used as the soreness score. A recovery pillar needs energy, fatigue, and soreness.</p>
            </>
          ) : null}
          {error ? <p className="text-sm text-attention" role="alert">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit">{editingId ? "Save changes" : "Save"}</Button>
            {editingId ? (
              <Button variant="secondary" onClick={() => { setEditingId(null); setForm({}); }}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
        {kind === "hydration" ? (
          <form
            className="mt-4 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void fetch("/api/v1/me/logs?kind=hydration", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ targetMilliliters: Number(target) }),
              }).then(async (response) => {
                if (!response.ok) setError("Could not save the target.");
                else await load();
              });
            }}
          >
            <Field label="Daily target (ml)">
              <TextInput value={target} onChange={(event) => setTarget(event.target.value)} />
            </Field>
            <Button type="submit" variant="secondary">Save target</Button>
          </form>
        ) : null}
      </Card>
      {loading ? <p className="text-sm text-muted">Loading records…</p> : null}
      {!loading && records.length === 0 ? (
        <Card><p className="text-sm text-ink-soft">No entries yet. What you save here stays on your account.</p></Card>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => (
            <li key={String(record.id)}>
              <Card>
                <p className="text-sm font-semibold">
                  {String(record.name ?? record.logged_on ?? record.start_time ?? record.started_at ?? "Entry")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {record.duration_hours != null ? `${record.duration_hours} h · ` : ""}
                  {record.milliliters != null ? `${record.milliliters} ml · ` : ""}
                  {record.minutes != null ? `${record.minutes} min · ` : ""}
                  {record.calories != null ? `${record.calories} kcal · ` : ""}
                  source {String(record.source ?? "manual")}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => editRecord(record)}>Edit</Button>
                  <Button variant="secondary" onClick={() => void remove(String(record.id))}>Delete</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
