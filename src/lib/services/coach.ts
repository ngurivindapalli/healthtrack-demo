import { getBehavior } from "@/lib/behaviors";
import type { AppModel } from "@/lib/engines/view-model";
import { STATE_COPY } from "@/lib/metrics";
import type { CoachMessage, DemoState } from "@/lib/types";

export interface CoachReply {
  content: string;
  sources: string[];
  safetyFlag: boolean;
}

const SUGGESTIONS = [
  "Why is my status what it is?",
  "Why this ONE?",
  "What changed in recovery?",
  "What do my labs add?",
  "Should I be worried?",
];

export function coachSuggestions(): string[] {
  return SUGGESTIONS;
}

export function answerCoach(
  question: string,
  state: DemoState,
  model: AppModel,
): CoachReply {
  const q = question.toLowerCase();
  const status = model.status;
  const one = model.todayOne;
  const sources = [
    `Wellness state from ${status.engineVersion}`,
    "Personal baseline (median / MAD), not a population score",
    "Association language only — not causation",
  ];

  if (status.safety.redirectToCare) {
    return {
      content: `${status.safety.reason}\n\nI will not keep coaching a wellness experiment on top of that. Please use a clinician or urgent care as appropriate. ${status.clinicalDisclaimer}`,
      sources,
      safetyFlag: true,
    };
  }

  if (
    q.includes("worried") ||
    q.includes("diagnos") ||
    q.includes("disease") ||
    q.includes("diabetes") ||
    q.includes("heart attack")
  ) {
    return {
      content: `I can't tell you whether something is medically wrong — HealthTrack 1.0 does not diagnose or detect disease.\n\nWhat the engine can say: your consumer-facing state is ${STATE_COPY[status.state].label.toLowerCase()}, based on how several personal signals compare with your own baseline. ${status.summary}\n\nIf you feel acutely unwell, or if a lab result is outside an interval your clinician uses, that's a care conversation, not a coaching one.\n\n${status.clinicalDisclaimer}`,
      sources,
      safetyFlag: true,
    };
  }

  if (q.includes("lab") || q.includes("a1c") || q.includes("hba1c") || q.includes("glucose")) {
    const latest = state.labReports
      .slice()
      .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];
    const a1c = latest?.results.find((item) => item.analyte === "HbA1c");
    if (!a1c) {
      return {
        content:
          "There is no parsed lab report on this account. Today's ONE uses stored measurements and check-ins only.",
        sources,
        safetyFlag: false,
      };
    }
    return {
      content: `Latest parsed ${latest.labName} report (${latest.collectedAt}): HbA1c ${a1c.value}% ${a1c.priorValue != null ? `(was ${a1c.priorValue}% on ${a1c.priorDate})` : ""}. ${a1c.note}\n\nLabs are episodic context, not a daily score. HealthTrack uses them to rank low-risk behaviors — for you, that supports keeping post-dinner walking in the Repeat ONE slot — and does not turn a lab interval into a diagnosis.\n\nParser: ${latest.parser}. Parse confidence ${Math.round(latest.parseConfidence * 100)}%.`,
      sources: [...sources, `Lab report ${latest.id}`, `Parser ${latest.parser}`],
      safetyFlag: false,
    };
  }

  if (q.includes("one") || q.includes("should i do") || q.includes("what next") || q.includes("behavior")) {
    if (!one) {
      return {
        content: status.safety.reason
          ? `${status.safety.reason}\n\n${status.clinicalDisclaimer}`
          : "There isn't an eligible Today's ONE right now. That can happen during cold start, after declines, or when a safety rule suppresses coaching.",
        sources,
        safetyFlag: Boolean(status.safety.reason),
      };
    }
    const repeat = model.repeatOne;
    return {
      content: `Highest-priority issue today: ${STATE_COPY[status.state].label.toLowerCase()} wellness, driven by ${status.drivers.map((d) => d.label.toLowerCase()).join(", ") || "your recent pattern"}.\n\nToday's ONE is “${one.candidate.instruction}”\n\nWhy this, not a list: ${one.why}\n\nRanking used relevance, personal evidence, expected benefit, feasibility, confidence and preference, then penalized burden and uncertainty. The model did not invent the behavior — it selected from a curated low-risk library.\n\n${repeat ? `Repeat ONE stays “${repeat.candidate.title}” because it already has repeated personal observations. ${repeat.evidenceNote}` : "Repeat ONE is hidden until a behavior has enough personal evidence."}\n\nYou can decline, replace, or snooze. That feedback is stored on your account and changes ranking.`,
      sources,
      safetyFlag: false,
    };
  }

  if (q.includes("recover") || q.includes("hrv") || q.includes("rhr") || q.includes("heart")) {
    const recovery = model.pillars.find((p) => p.id === "recovery");
    return {
      content: `Recovery is ${recovery?.directionLabel.toLowerCase() ?? "still loading"}. ${recovery?.summary}\n\nMeasured: HRV and resting heart rate from stored companion measurements, plus your energy and stress check-ins. Missing values are not treated as zero.\nInferred: that several of those signals moving together is more informative than any one number.\nGeneral evidence: sleep and evening movement often relate to overnight recovery — that is population knowledge, not your proof.\nUncertainty: thresholds in ${status.engineVersion} are product calibrations, not clinically validated cutoffs.\n\n${status.clinicalDisclaimer}`,
      sources,
      safetyFlag: false,
    };
  }

  if (q.includes("sleep") || q.includes("bed")) {
    const sleep = model.pillars.find((p) => p.id === "sleep");
    return {
      content: `${sleep?.summary}\n\nYour personal sleep baseline is the primary comparison. Peer and general “7+ hours” ranges are secondary context only.\n\nToday's ONE is built around returning toward your usual bedtime rather than adding a stack of sleep hacks.`,
      sources,
      safetyFlag: false,
    };
  }

  if (q.includes("repeat") || q.includes("walk") || q.includes("work for me") || q.includes("progress")) {
    const walk = model.associations.find((a) => a.behaviorId === "evening-walk");
    return {
      content: `${walk?.summary ?? "Personal behavior associations are still forming."}\n\nProgress is not “you logged more data.” It is whether a behavior, done often enough, is repeatedly seen alongside better overnight signals. HealthTrack will keep saying association until a future experimental framework can support stronger claims.`,
      sources,
      safetyFlag: false,
    };
  }

  const driverLines = status.drivers
    .map((d) => `• ${d.summary} (${d.persistenceDays}d persistence)`)
    .join("\n");
  const oneLine = one
    ? `Today's ONE: ${one.candidate.instruction}`
    : "No ONE is currently eligible.";
  const behavior = one ? getBehavior(one.candidate.id) : undefined;

  return {
    content: `Your My Wellness Status is ${STATE_COPY[status.state].label} (${status.confidence} baseline, 7-day direction ${status.direction7d}).\n\n${status.summary}\n\nExplainable drivers from the deterministic engine:\n${driverLines || "• Still learning your baseline — comparisons are conservative."}\n\n${oneLine}${behavior ? `\n${one?.why}` : ""}\n\nI will stay on this priority instead of generating a ten-item plan.\n\n${status.clinicalDisclaimer}`,
    sources,
    safetyFlag: false,
  };
}

export function seedCoachWelcome(model: AppModel): CoachMessage {
  return {
    id: "welcome",
    role: "coach",
    createdAt: `${model.asOf}T17:10:00Z`,
    sources: [`${model.status.engineVersion}`],
    content: `I can explain the status engine, Today's ONE, trends, and labs. I will not diagnose.\n\nRight now the highest-priority issue is ${STATE_COPY[model.status.state].label.toLowerCase()} wellness. Ask me why, or what to do next.`,
  };
}
