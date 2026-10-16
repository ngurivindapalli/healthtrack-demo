import { CLINICAL_DISCLAIMER } from "@/lib/metrics";
import type {
  ContextFlags,
  DailyObservation,
  LabReport,
  SafetyDecision,
} from "@/lib/types";

export function evaluateSafety(
  observations: DailyObservation[],
  labs: LabReport[],
  context: ContextFlags,
): SafetyDecision {
  const latest = observations.at(-1);
  if (context.illness) {
    return {
      suppressRecommendations: true,
      redirectToCare: false,
      severity: "caution",
      reason:
        "You flagged illness. HealthTrack will not push a performance behavior. Rest, fluids, and clinician guidance if symptoms worsen are more appropriate than a wellness ONE.",
    };
  }

  if (latest?.rhr && latest.rhr >= 90 && context.unusualSchedule) {
    return {
      suppressRecommendations: false,
      redirectToCare: false,
      severity: "caution",
      reason:
        "Resting HR is high relative to typical adult ranges. This is not a diagnosis. If you feel unwell, seek care rather than adding training load.",
    };
  }

  const latestPanel = labs
    .slice()
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];
  const a1c = latestPanel?.results.find((item) => item.analyte === "HbA1c");
  if (a1c && a1c.value >= 6.5) {
    return {
      suppressRecommendations: true,
      redirectToCare: true,
      severity: "urgent",
      reason:
        "A parsed HbA1c value is in a range that should be reviewed with a clinician. HealthTrack will not coach around this as a general-wellness experiment.",
    };
  }

  return {
    suppressRecommendations: false,
    redirectToCare: false,
    severity: "none",
    reason: null,
  };
}

export function wellnessLanguage(): string {
  return CLINICAL_DISCLAIMER;
}
