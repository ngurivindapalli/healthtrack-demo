export const COACH_SYSTEM_PROMPT = `You are HealthTrack's wellness coach — a warm, thoughtful, knowledgeable companion who helps people understand their daily health patterns.

Your personality is calm, approachable, encouraging, and grounded.

Speak like a thoughtful human wellness coach, not a clinical report or customer-service chatbot.

Writing style:
- Use natural, conversational English.
- Prefer short, clear paragraphs.
- Use contractions when appropriate.
- Use em dashes occasionally when they improve the flow.
- Avoid excessive bullet points.
- Avoid generic motivational phrases.
- Avoid repetitive openings such as 'Great question!'
- Never say 'As an AI language model.'
- Avoid overly formal or robotic language.
- Be empathetic without sounding patronizing.
- Ask thoughtful follow-up questions when useful.
- Avoid ending every response with a question.
- Keep typical answers around 75–150 words unless more detail is necessary.

Health guidance:
- Use the user's available health data to personalize responses.
- Never invent health metrics or observations.
- Explain trends in understandable language.
- Distinguish associations from proven causes.
- Do not diagnose diseases.
- Do not prescribe medication or treatment.
- Clearly acknowledge uncertainty.
- Recommend professional medical evaluation when appropriate.
- Escalate potentially urgent symptoms appropriately.
- Never imply that wellness scores establish medical diagnoses.

Your goal is to help users understand their health patterns and make informed everyday wellness decisions.`;

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
export const COACH_TIMEOUT_MS = 12_000;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type CoachTurnResult =
  | { ok: true; content: string }
  | { ok: false; status: number; message: string };

export function sanitizeHistory(input: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(input)) return [];
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of input.slice(-8)) {
    if (!item || typeof item !== "object") continue;
    const record = item as { role?: unknown; content?: unknown };
    const content = String(record.content ?? "").replace(/\s+/g, " ").trim().slice(0, 800);
    if (!content) continue;
    if (record.role === "user") history.push({ role: "user", content });
    else if (record.role === "coach" || record.role === "assistant") history.push({ role: "assistant", content });
  }
  return history;
}

export function sanitizeContext(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .slice(0, 2500);
}

export function buildGroqMessages(question: string, history: unknown, context: string) {
  return [
    { role: "system" as const, content: COACH_SYSTEM_PROMPT },
    {
      role: "system" as const,
      content: `Measurements already stored for this person. Cite only these. If a number is not here, say you don't have it.\n\n${sanitizeContext(context) || "No measurements were provided."}`,
    },
    ...sanitizeHistory(history),
    { role: "user" as const, content: question.trim().slice(0, 500) },
  ];
}

export async function completeCoachTurn(
  input: { question: string; history: unknown; context: string },
  env: { GROQ_API_KEY?: string; GROQ_MODEL?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CoachTurnResult> {
  const key = env.GROQ_API_KEY?.trim();
  if (!key) {
    return { ok: false, status: 503, message: "The wellness coach is not configured on this server yet." };
  }
  const question = input.question.trim().slice(0, 500);
  if (!question) return { ok: false, status: 400, message: "Enter a question for the coach." };
  const model = (env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL).slice(0, 80);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 320,
        messages: buildGroqMessages(question, input.history, input.context),
      }),
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: 503, message: "The wellness coach could not authenticate. The server API key is missing or invalid." };
    }
    if (!response.ok) {
      return { ok: false, status: 502, message: "The wellness coach is temporarily unavailable. Please try again." };
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, status: 502, message: "The wellness coach returned an empty reply. Please try again." };
    }
    return { ok: true, content: content.slice(0, 4000) };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: aborted ? 504 : 502,
      message: aborted
        ? "The wellness coach took too long to answer. Please try again."
        : "The wellness coach could not be reached. Please try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}
