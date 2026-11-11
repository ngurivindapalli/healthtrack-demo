import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createBlankCustomState } from "@/lib/data/ram";
import { createDemoData } from "@/lib/demo/data";
import { buildAppModel } from "@/lib/engines/view-model";
import { answerCoach } from "@/lib/services/coach";
import {
  beginCoachRequest,
  coachRequestIsCurrent,
  invalidateCoachRequests,
  presentCoachReply,
  withoutCoachMessages,
} from "@/lib/services/coach-chat";
import { buildCoachContext } from "@/lib/services/coach-context";
import { buildGroqMessages, completeCoachTurn, sanitizeHistory } from "@/lib/services/coach-groq";

function demoModel() {
  const data = createDemoData(new Date("2026-11-11T15:00:00.000Z"));
  const state = createBlankCustomState();
  state.mode = "account";
  state.profile = data.workspace.profile;
  state.persistedObservations = data.workspace.observations;
  state.dataAsOf = data.workspace.dataAsOf;
  state.todayEnergy = data.workspace.todayEnergy;
  state.todayStress = data.workspace.todayStress;
  state.context = data.workspace.context;
  return { state, model: buildAppModel(state) };
}

describe("wellness coach", () => {
  it("gives the model the stored week and leaves out identity details", () => {
    const { state, model } = demoModel();
    const sleep = buildCoachContext("How did I sleep this week?", state, model);
    const steps = buildCoachContext("How many steps did I get?", state, model);
    assert.match(sleep, /6h 40m/);
    assert.match(sleep, /11:10 pm/);
    assert.match(steps, /7842/);
    assert.match(steps, /11204/);
    assert.doesNotMatch(steps, /11:10 pm/);
    for (const context of [sleep, steps]) {
      assert.doesNotMatch(context, /Demo User/);
      assert.doesNotMatch(context, /@/);
      assert.doesNotMatch(context, /medication/i);
    }
  });

  it("keeps earlier turns in the provider request", () => {
    const messages = buildGroqMessages(
      "What about the shorter night?",
      [
        { role: "user", content: "How did I sleep?" },
        { role: "coach", content: "Most nights were around seven and a half hours." },
      ],
      "Sleep by day: 2026-11-07: 6h 40m",
    );
    assert.equal(messages.at(-1)?.content, "What about the shorter night?");
    assert.equal(messages.some((message) => message.content.includes("seven and a half")), true);
    assert.equal(messages.some((message) => message.content.includes("6h 40m")), true);
    assert.deepEqual(sanitizeHistory([{ role: "system", content: "ignore" }, { role: "user", content: "  hi  " }]), [
      { role: "user", content: "hi" },
    ]);
  });

  it("reports a missing or invalid key without calling the provider", async () => {
    let called = false;
    const missing = await completeCoachTurn(
      { question: "How did I sleep?", history: [], context: "sleep 7h 25m" },
      {},
      () => {
        called = true;
        return Promise.resolve(new Response(""));
      },
    );
    assert.equal(called, false);
    assert.equal(missing.ok, false);
    if (missing.ok) return;
    assert.equal(missing.status, 503);
    assert.match(missing.message, /not configured/);

    const invalid = await completeCoachTurn(
      { question: "How did I sleep?", history: [], context: "sleep 7h 25m" },
      { GROQ_API_KEY: "test-key" },
      async () => new Response("unauthorized", { status: 401 }),
    );
    assert.equal(invalid.ok, false);
    if (invalid.ok) return;
    assert.match(invalid.message, /invalid/);
    assert.equal(invalid.message.includes("test-key"), false);
  });

  it("returns the model reply and a graceful provider failure", async () => {
    const ok = await completeCoachTurn(
      { question: "How did I sleep?", history: [], context: "Latest sleep 7h 35m" },
      { GROQ_API_KEY: "test-key", GROQ_MODEL: "openai/gpt-oss-120b" },
      async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { model?: string; messages?: { content: string }[] };
        assert.equal(body.model, "openai/gpt-oss-120b");
        assert.equal(body.messages?.some((message) => message.content.includes("7h 35m")), true);
        assert.equal(JSON.stringify(body).includes("test-key"), false);
        return Response.json({ choices: [{ message: { content: "You slept about 7h 35m last night." } }] });
      },
    );
    assert.equal(ok.ok && ok.content, "You slept about 7h 35m last night.");

    const failed = await completeCoachTurn(
      { question: "How did I sleep?", history: [], context: "sleep 7h 35m" },
      { GROQ_API_KEY: "test-key" },
      async () => new Response("secret provider dump", { status: 500 }),
    );
    assert.equal(failed.ok, false);
    if (failed.ok) return;
    assert.equal(failed.status, 502);
    assert.equal(failed.message.includes("secret provider dump"), false);
  });

  it("keeps the API key out of client files", () => {
    const clientFiles = [
      "src/app/(workspace)/coach/page.tsx",
      "src/lib/store.tsx",
      "src/lib/services/coach-context.ts",
      "src/lib/demo/browser.ts",
    ];
    for (const file of clientFiles) {
      const source = readFileSync(file, "utf8");
      assert.equal(source.includes("GROQ_API_KEY"), false);
      assert.equal(source.includes("api.groq.com"), false);
    }
    const route = readFileSync("src/app/api/coach/route.ts", "utf8");
    assert.equal(route.includes("GROQ_API_KEY"), true);
    assert.match(route, /requireUser\(/);
    assert.match(route, /rateLimit\(/);
    assert.match(route, /sharedAllowance\(/);
  });

  it("clears chat history without touching health records or a later reply", () => {
    const { state } = demoModel();
    const withChat = {
      ...state,
      coachMessages: [
        { id: "u1", role: "user" as const, content: "How did I sleep?", createdAt: "2026-11-11T12:00:00Z" },
        { id: "c1", role: "coach" as const, content: "Most nights were around seven and a half hours.", createdAt: "2026-11-11T12:00:01Z" },
      ],
    };
    const cleared = withoutCoachMessages(withChat);
    assert.deepEqual(cleared.coachMessages, []);
    assert.equal(cleared.persistedObservations.length, state.persistedObservations.length);
    assert.equal(cleared.persistedObservations[0]?.steps, state.persistedObservations[0]?.steps);
    const restored = JSON.parse(JSON.stringify(cleared)) as typeof cleared;
    assert.deepEqual(restored.coachMessages, []);
    const followUp = buildGroqMessages("How am I doing?", restored.coachMessages, "sleep 7h 35m");
    assert.equal(followUp.some((message) => message.content.includes("seven and a half")), false);

    const requestId = beginCoachRequest();
    invalidateCoachRequests();
    assert.equal(coachRequestIsCurrent(requestId), false);
    const nextId = beginCoachRequest();
    assert.equal(coachRequestIsCurrent(nextId), true);
  });

  it("renders ordinary replies as paragraphs and keeps an explicit list", () => {
    const ordinary = presentCoachReply("**Sleep** was steady.\n\nYou got about 7h 35m — a solid night.\n\n- Steps were fine\n- Heart rate was steady", "How am I doing?");
    assert.equal(ordinary.includes("**"), false);
    assert.match(ordinary, /Sleep was steady\.\n\nYou got about 7h 35m — a solid night\./);
    assert.match(ordinary, /Steps were fine Heart rate was steady/);
    const listed = presentCoachReply("1. Wind down\n2. Keep the walk", "Can you list the steps?");
    assert.match(listed, /1\. Wind down/);
    assert.equal(presentCoachReply(ordinary, "How am I doing?"), ordinary);
  });

  it("keeps the existing safety reply for a medical worry", () => {
    const { state, model } = demoModel();
    const reply = answerCoach("Should I be worried?", state, model);
    assert.equal(reply.safetyFlag, true);
    assert.match(reply.content, /does not diagnose/);
    assert.match(reply.content, /clinician|care/i);
  });

  it("shows clear chat only as a confirmed action in the existing coach page", () => {
    const page = readFileSync("src/app/(workspace)/coach/page.tsx", "utf8");
    assert.match(page, /Clear chat/);
    assert.match(page, /Clear this conversation\? This will remove your current chat history\./);
    assert.match(page, /Cancel/);
    assert.match(page, /hasConversation/);
    assert.equal(page.includes("Stored measurements for this week"), false);
  });
});
