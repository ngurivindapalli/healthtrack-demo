import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createBlankCustomState } from "@/lib/data/ram";
import { createDemoData } from "@/lib/demo/data";
import { buildAppModel } from "@/lib/engines/view-model";
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
  });
});
