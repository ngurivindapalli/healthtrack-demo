"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function LabReportPage() {
  const params = useParams<{ reportId: string }>();
  const { state } = useDemo();
  const report = state.labReports.find((item) => item.id === params.reportId);

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <Link href="/profile/labs" className="text-sm text-pine">
          ← Labs
        </Link>
        <p>Report not found in this demo workspace.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/profile/labs" className="text-sm text-pine hover:underline">
        ← Labs
      </Link>
      <header>
        <Eyebrow>Provenance</Eyebrow>
        <h1 className="display mt-1 text-3xl">{report.labName}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {report.panel}. Collected {report.collectedAt}, reported {report.reportedAt}. Filename {report.filename}. Parser {report.parser} ({Math.round(report.parseConfidence * 100)}% parse confidence). Simulated parse.
        </p>
      </header>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-paper-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Analyte</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">Lab interval</th>
              <th className="px-4 py-3 font-medium">Prior</th>
              <th className="px-4 py-3 font-medium">Flag</th>
            </tr>
          </thead>
          <tbody>
            {report.results.map((row) => (
              <tr key={row.analyte} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-medium">{row.analyte}</p>
                  <p className="text-xs text-muted">{row.note}</p>
                </td>
                <td className="px-4 py-3">
                  {row.value} {row.unit}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {row.generalLow ?? "—"}–{row.generalHigh ?? "—"}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {row.priorValue != null ? `${row.priorValue} (${row.priorDate})` : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.flag === "in_interval"
                    ? "In interval"
                    : row.flag === "above"
                      ? "Above interval"
                      : row.flag === "below"
                        ? "Below interval"
                        : "Unspecified"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted">
        Laboratory intervals are a general reference layer. They are not the same as your personal wearable baseline, and they are not a diagnosis.
      </p>
    </div>
  );
}
