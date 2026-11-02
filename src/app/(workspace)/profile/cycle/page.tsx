"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, Eyebrow, Field, TextArea, TextInput } from "@/components/ui";

export default function CyclePage() {
  const [enabled, setEnabled] = useState(false);
  const [length, setLength] = useState("");
  const [variability, setVariability] = useState("");
  const [lifeContext, setLifeContext] = useState("");
  const [loggedOn, setLoggedOn] = useState("");
  const [kind, setKind] = useState("symptom");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/v1/me/cycle");
    if (!response.ok) return;
    const body = (await response.json()) as {
      consent?: { enabled?: number; typical_length_days?: number; variability?: string; life_context?: string } | null;
      entries?: Array<Record<string, unknown>>;
    };
    setEnabled(body.consent?.enabled === 1);
    setLength(body.consent?.typical_length_days ? String(body.consent.typical_length_days) : "");
    setVariability(body.consent?.variability ?? "");
    setLifeContext(body.consent?.life_context ?? "");
    setEntries(body.entries ?? []);
  }

  useEffect(() => {
    void fetch("/api/v1/me/cycle")
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as {
          consent?: { enabled?: number; typical_length_days?: number; variability?: string; life_context?: string } | null;
          entries?: Array<Record<string, unknown>>;
        };
        setEnabled(body.consent?.enabled === 1);
        setLength(body.consent?.typical_length_days ? String(body.consent.typical_length_days) : "");
        setVariability(body.consent?.variability ?? "");
        setLifeContext(body.consent?.life_context ?? "");
        setEntries(body.entries ?? []);
      })
      .catch(() => setError("Could not load cycle information."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/profile" className="text-sm text-pine hover:underline">← Profile</Link>
      <header>
        <Eyebrow>Optional</Eyebrow>
        <h1 className="display mt-1 text-3xl">Cycle context</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          This is off unless you opt in. It is not assumed, it does not change the Wellness Tracker, and estimates are not shown as medical certainty. Turning it off stops it from being available as coaching context.
        </p>
      </header>
      <Card className="space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          <span>I want to record cycle information for this account.</span>
        </label>
        <Field label="Typical length in days (optional)">
          <TextInput value={length} onChange={(event) => setLength(event.target.value)} />
        </Field>
        <Field label="Variability">
          <TextInput value={variability} placeholder="Regular, irregular, or unsure" onChange={(event) => setVariability(event.target.value)} />
        </Field>
        <Field label="Context you want remembered">
          <TextArea rows={3} value={lifeContext} placeholder="Contraception, pregnancy, postpartum, or perimenopause — only if you choose to record it." onChange={(event) => setLifeContext(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-attention" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-pine" role="status">{message}</p> : null}
        <Button
          onClick={() => {
            setError("");
            void fetch("/api/v1/me/cycle", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                enabled,
                typicalLengthDays: length || null,
                variability,
                lifeContext,
              }),
            }).then(async (response) => {
              const body = (await response.json()) as { error?: { message?: string } };
              if (!response.ok) setError(body.error?.message ?? "Could not save.");
              else {
                setMessage(enabled ? "Cycle tracking is on." : "Cycle tracking is off. It will not be used as coaching context.");
                await load();
              }
            });
          }}
        >
          Save preference
        </Button>
      </Card>
      {enabled ? (
        <Card className="space-y-3">
          <Field label="Date"><TextInput type="date" value={loggedOn} onChange={(event) => setLoggedOn(event.target.value)} /></Field>
          <Field label="Entry">
            <select className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="period">Period</option>
              <option value="symptom">Symptom</option>
              <option value="note">Note</option>
            </select>
          </Field>
          <Field label="Notes"><TextArea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
          <Button
            variant="secondary"
            onClick={() => {
              void fetch("/api/v1/me/cycle", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ loggedOn, kind, notes }),
              }).then(async (response) => {
                const body = (await response.json()) as { error?: { message?: string } };
                if (!response.ok) setError(body.error?.message ?? "Could not add the entry.");
                else {
                  setNotes("");
                  await load();
                }
              });
            }}
          >
            Add entry
          </Button>
          <ul className="space-y-2 text-sm">
            {entries.map((entry) => (
              <li key={String(entry.id)} className="rounded-xl bg-paper px-3 py-2">
                {String(entry.logged_on)} · {String(entry.kind)} {entry.notes ? `· ${String(entry.notes)}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card>
        <p className="text-sm text-ink-soft">Deleting cycle data removes the preference and every cycle entry. Other health records stay.</p>
        <Button
          className="mt-3"
          variant="secondary"
          onClick={() => {
            if (!window.confirm("Delete cycle data and withdraw consent?")) return;
            void fetch("/api/v1/me/cycle", { method: "DELETE" }).then(async () => {
              setEnabled(false);
              setMessage("Cycle data was deleted.");
              await load();
            });
          }}
        >
          Delete cycle data
        </Button>
      </Card>
    </div>
  );
}
