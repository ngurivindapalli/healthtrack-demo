"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Card, Eyebrow } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function LabsPage() {
  const { state, addSampleLabUpload } = useDemo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const reports = [...state.labReports].sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/profile" className="text-sm text-pine hover:underline">
        ← Profile
      </Link>
      <header>
        <Eyebrow>Labs</Eyebrow>
        <h1 className="display mt-1 text-3xl">Parsed reports</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Live OCR is not run. Uploading a file attaches a labeled sample parse so you can see provenance, intervals, and longitudinal change.
        </p>
      </header>

      <Card>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,.png,.jpg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            addSampleLabUpload(file?.name);
            setMessage(
              file
                ? `Simulated parse of “${file.name}”. No file left this browser.`
                : "Sample parse added.",
            );
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => inputRef.current?.click()}>Upload report (simulated parse)</Button>
          <Button variant="secondary" onClick={() => addSampleLabUpload()}>
            Add sample Labcorp parse
          </Button>
        </div>
        {message ? <p className="mt-3 text-sm text-pine">{message}</p> : null}
      </Card>

      {reports.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-soft">No reports yet. Add the sample parse to see HbA1c trend context.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id}>
              <Link href={`/profile/labs/${report.id}`}>
                <Card className="hover:bg-paper">
                  <p className="font-semibold">
                    {report.labName} · {report.panel}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Collected {report.collectedAt} · parser {report.parser} · confidence {Math.round(report.parseConfidence * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-muted">{report.filename}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
