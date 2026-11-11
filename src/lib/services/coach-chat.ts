let coachRequestId = 0;

export function beginCoachRequest(): number {
  return coachRequestId;
}

export function invalidateCoachRequests(): number {
  coachRequestId += 1;
  return coachRequestId;
}

export function coachRequestIsCurrent(requestId: number): boolean {
  return requestId === coachRequestId;
}

export function withoutCoachMessages<T extends { coachMessages: unknown[] }>(state: T): T {
  return { ...state, coachMessages: [] };
}

function tidy(content: string): string {
  return content
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wantsStructure(question: string): boolean {
  return /\b(steps|step by step|bullet|bullets|make a list|comparison|compare)\b/i.test(question);
}

/** Turn ordinary Markdown into paragraphs. Leave an explicit list or comparison alone. */
export function presentCoachReply(content: string, question: string): string {
  const text = tidy(content).slice(0, 4000);
  if (wantsStructure(question)) return text;
  const unwrapped = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");
  return unwrapped
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.length > 1 && lines.every((line) => /^\s*(?:[-*]|\d+\.)\s+\S/.test(line))) {
        return lines
          .map((line) => line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim())
          .filter(Boolean)
          .join(" ");
      }
      return block;
    })
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
