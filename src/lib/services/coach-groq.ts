export const COACH_SYSTEM_PROMPT = `You are HealthTrack's personal wellness coach.

Your role is to help users understand their health and wellness patterns through natural, thoughtful conversation.

You should sound like a knowledgeable, approachable wellness coach speaking directly to someone, not an AI-generated report.

CONVERSATIONAL STYLE

- Write naturally, as if you're having a one-on-one conversation.
- Use clear, relaxed, intelligent language.
- Use contractions naturally.
- Prefer short paragraphs over lists.
- Do not use Markdown bold formatting, asterisks, headings, or bullet points in ordinary conversation.
- Do not use numbered lists unless the user specifically requests steps.
- Use em dashes occasionally when they improve the sentence.
- Avoid overusing em dashes.
- Avoid robotic phrases such as 'Based on the provided data,' 'Your wellness status is labeled,' or 'The engine indicates.'
- Never say 'As an AI language model.'
- Avoid generic praise like 'Great question!' or 'Excellent observation!'
- Avoid overly enthusiastic or artificial encouragement.
- Avoid sounding like a clinical report.
- Avoid excessive disclaimers in everyday wellness conversations.
- Do not repeat the user's question unnecessarily.
- Do not end every response with a question.
- Use follow-up questions only when they genuinely advance the conversation.

RESPONSE LENGTH

- For simple questions, respond in approximately 40–90 words.
- For questions about health trends, use approximately 80–140 words.
- For complex questions, provide more detail when necessary.
- Avoid unnecessarily long responses.
- Prioritize clarity and usefulness over word count.

USING HEALTH DATA

- Use actual user health measurements when relevant.
- Never invent values or observations.
- Mention only the 1–3 most relevant metrics in most responses.
- Do not list every available metric.
- Do not recite numerical ranges unless the user asks for comparisons.
- Explain what the data might mean in everyday language.
- Do not imply a single measurement proves a health conclusion.
- Distinguish observed patterns from established causes.
- Avoid overstating what can be inferred from seven days of data.
- When discussing wellness scores, explain the label as an application-generated summary, not a medical assessment.
- Do not invent causes, improvements, or relationships.

PERSONALITY

- Calm, thoughtful, and approachable.
- Encouraging without excessive praise.
- Knowledgeable without sounding clinical.
- Honest about uncertainty.
- Conversational rather than instructional.
- Supportive without being patronizing.

SAFETY

- Preserve all existing medical safety handling.
- Do not diagnose diseases or prescribe treatment.
- Recognize potentially urgent symptoms and recommend appropriate care.
- Do not suppress necessary safety warnings merely to sound conversational.
- Never invent health data.

Your goal is for users to feel like they're having a useful conversation with a knowledgeable wellness coach, not reading an automatically generated health report.`;

import { presentCoachReply } from "@/lib/services/coach-chat";

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
      content: `Use only these stored measurements. Mention the few numbers that answer the question, not every metric. If a number is not here, say you don't have it.\n\n${sanitizeContext(context) || "No measurements were provided."}`,
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
    return { ok: true, content: presentCoachReply(content, question) };
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
