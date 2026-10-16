import type { LabReport } from "@/lib/types";

function flagFor(
  value: number,
  low: number | null,
  high: number | null,
): LabReport["results"][number]["flag"] {
  if (low == null && high == null) return "unspecified";
  if (low != null && value < low) return "below";
  if (high != null && value > high) return "above";
  return "in_interval";
}

function result(
  analyte: string,
  value: number,
  unit: string,
  generalLow: number | null,
  generalHigh: number | null,
  note: string,
  priorValue: number | null = null,
  priorDate: string | null = null,
): LabReport["results"][number] {
  return {
    analyte,
    value,
    unit,
    generalLow,
    generalHigh,
    flag: flagFor(value, generalLow, generalHigh),
    priorValue,
    priorDate,
    note,
  };
}

export const RAM_LAB_REPORTS: LabReport[] = [
  {
    id: "lab-2026-04",
    collectedAt: "2026-04-12",
    reportedAt: "2026-04-14",
    labName: "Quest Diagnostics",
    filename: "Quest_Metabolic_Apr2026.pdf",
    parser: "demo-lab-parser@0.1",
    parseConfidence: 0.94,
    panel: "Metabolic + micronutrient",
    results: [
      result("HbA1c", 5.4, "%", 4.0, 5.6, "Prior result used for longitudinal comparison.", null, null),
      result("Glucose, fasting", 92, "mg/dL", 70, 99, "Laboratory reference interval.", null, null),
      result("Vitamin D, 25-OH", 32, "ng/mL", 30, 100, "Laboratory reference interval.", null, null),
      result("LDL-C", 118, "mg/dL", null, 99, "General lab interval; interpret with a clinician.", null, null),
      result("HDL-C", 48, "mg/dL", 40, null, "Laboratory reference interval.", null, null),
      result("Triglycerides", 128, "mg/dL", null, 149, "Laboratory reference interval.", null, null),
      result("hs-CRP", 0.8, "mg/L", null, 3.0, "Laboratory reference interval.", null, null),
      result("TSH", 1.9, "mIU/L", 0.4, 4.5, "Laboratory reference interval.", null, null),
    ],
  },
  {
    id: "lab-2026-09",
    collectedAt: "2026-09-28",
    reportedAt: "2026-09-30",
    labName: "Quest Diagnostics",
    filename: "Quest_Metabolic_Sep2026.pdf",
    parser: "demo-lab-parser@0.1",
    parseConfidence: 0.91,
    panel: "Metabolic + micronutrient",
    results: [
      result(
        "HbA1c",
        5.7,
        "%",
        4.0,
        5.6,
        "Up from 5.4% in April. This is a laboratory interval change — not a HealthTrack diagnosis.",
        5.4,
        "2026-04-12",
      ),
      result("Glucose, fasting", 99, "mg/dL", 70, 99, "At the top of the reported laboratory interval.", 92, "2026-04-12"),
      result("Vitamin D, 25-OH", 28, "ng/mL", 30, 100, "Slightly below the lab interval versus April.", 32, "2026-04-12"),
      result("LDL-C", 121, "mg/dL", null, 99, "Still above the printed lab interval.", 118, "2026-04-12"),
      result("HDL-C", 47, "mg/dL", 40, null, "Near the prior result.", 48, "2026-04-12"),
      result("Triglycerides", 142, "mg/dL", null, 149, "Higher than April; still inside the printed interval.", 128, "2026-04-12"),
      result("hs-CRP", 1.1, "mg/L", null, 3.0, "Inside the laboratory interval.", 0.8, "2026-04-12"),
      result("TSH", 2.0, "mIU/L", 0.4, 4.5, "Stable versus April.", 1.9, "2026-04-12"),
    ],
  },
];

export const SAMPLE_UPLOAD_REPORT: LabReport = {
  id: "lab-demo-upload",
  collectedAt: "2026-10-02",
  reportedAt: "2026-10-03",
  labName: "Labcorp",
  filename: "uploaded-report.pdf",
  parser: "demo-lab-parser@0.1",
  parseConfidence: 0.88,
  panel: "Basic metabolic + A1c",
  results: [
    result(
      "HbA1c",
      5.6,
      "%",
      4.0,
      5.6,
      "Simulated parse of an uploaded file. Not a live OCR result.",
      5.7,
      "2026-09-28",
    ),
    result("Glucose, fasting", 96, "mg/dL", 70, 99, "Simulated parse of an uploaded file.", 99, "2026-09-28"),
    result("eGFR", 92, "mL/min/1.73m²", 60, null, "Simulated parse of an uploaded file.", null, null),
  ],
};
