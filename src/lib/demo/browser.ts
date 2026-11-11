import { assessDemoData, createDemoData, type DemoData, type DemoLog } from "@/lib/demo/data";
import type { WorkspacePayload } from "@/lib/services/workspace";

const STORAGE_KEY = "healthtrack-demo-v1";

export function loadDemoData(): DemoData {
  if (typeof window === "undefined") return createDemoData();
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const created = createDemoData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
    return created;
  }
  try {
    return JSON.parse(saved) as DemoData;
  } catch {
    const created = createDemoData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
    return created;
  }
}

export function saveDemoData(data: DemoData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetDemoData(): DemoData {
  const created = createDemoData();
  saveDemoData(created);
  return created;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function error(status: number, code: string, message: string) {
  return json({ error: { code, message } }, status);
}

function id(): string {
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function day(value: unknown): string | null {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function numberIn(value: unknown, min: number, max: number): number | null | "invalid" {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return "invalid";
  return number;
}

function applyLog(data: DemoData, kind: string, body: Record<string, unknown>, existingId?: string): { ok: true; id: string } | { ok: false; message: string } {
  const now = new Date().toISOString();
  const recordId = existingId ?? id();
  if (kind === "hydration" && body.targetMilliliters != null && existingId == null) {
    const target = numberIn(body.targetMilliliters, 1, 10000);
    if (target == null || target === "invalid") return { ok: false, message: "Enter a hydration target between 1 and 10000 ml." };
    data.hydrationTarget = target;
    return { ok: true, id: "target" };
  }
  if (kind === "meal") {
    const loggedOn = day(body.loggedOn);
    const name = String(body.name ?? "").trim().slice(0, 120);
    if (!loggedOn || !name) return { ok: false, message: "A date and meal name are required." };
    const calories = numberIn(body.calories, 0, 20000);
    if (calories === "invalid") return { ok: false, message: "Nutrition numbers are out of range." };
    const row: DemoLog = { id: recordId, logged_on: loggedOn, name, notes: String(body.notes ?? "").slice(0, 500), calories, protein_g: null, carbs_g: null, fat_g: null, source: "manual", source_record_id: null, created_at: now, updated_at: now };
    data.meals = [row, ...data.meals.filter((item) => item.id !== recordId)];
    return { ok: true, id: recordId };
  }
  if (kind === "hydration") {
    const loggedOn = day(body.loggedOn);
    const milliliters = numberIn(body.milliliters, 1, 5000);
    if (!loggedOn || milliliters == null || milliliters === "invalid") return { ok: false, message: "Enter a date and 1–5000 ml." };
    const row: DemoLog = { id: recordId, logged_on: loggedOn, milliliters, source: "manual", source_record_id: null, created_at: now };
    data.hydration = [row, ...data.hydration.filter((item) => item.id !== recordId)];
    return { ok: true, id: recordId };
  }
  if (kind === "sleep") {
    const start = new Date(String(body.startTime ?? ""));
    const end = new Date(String(body.endTime ?? ""));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return { ok: false, message: "Sleep end must be after the start." };
    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (hours > 24) return { ok: false, message: "Sleep entries must be 24 hours or less." };
    const row: DemoLog = { id: recordId, start_time: start.toISOString(), end_time: end.toISOString(), duration_hours: Math.round(hours * 100) / 100, notes: String(body.notes ?? "").slice(0, 500), source: "manual", source_record_id: null, created_at: now };
    data.sleep = [row, ...data.sleep.filter((item) => item.id !== recordId)];
    return { ok: true, id: recordId };
  }
  if (kind === "workout") {
    const started = new Date(String(body.startedAt ?? ""));
    const minutes = numberIn(body.minutes, 1, 1440);
    const name = String(body.name ?? "").trim().slice(0, 120);
    if (Number.isNaN(started.getTime()) || !name || minutes == null || minutes === "invalid") return { ok: false, message: "Enter a start time, name, and 1–1440 minutes." };
    const row: DemoLog = { id: recordId, name, started_at: started.toISOString(), minutes, notes: "", source: "manual", source_record_id: null, created_at: now };
    data.workouts = [row, ...data.workouts.filter((item) => item.id !== recordId)];
    return { ok: true, id: recordId };
  }
  if (kind === "recovery") {
    const loggedOn = day(body.loggedOn);
    const energy = numberIn(body.energy, 0, 10);
    const fatigue = numberIn(body.fatigue, 0, 10);
    const stress = numberIn(body.stress, 0, 10);
    const soreness = numberIn(body.soreness, 0, 10);
    if (!loggedOn || [energy, fatigue, stress, soreness].includes("invalid")) return { ok: false, message: "Enter a date and ratings from 0 to 10." };
    const row: DemoLog = { id: recordId, logged_on: loggedOn, energy, fatigue, stress, soreness, notes: "", updated_at: now, created_at: now };
    data.recovery = [row, ...data.recovery.filter((item) => item.id !== recordId)];
    return { ok: true, id: recordId };
  }
  return { ok: false, message: "That tracker does not exist." };
}

function listKind(data: DemoData, kind: string) {
  if (kind === "meal") return data.meals;
  if (kind === "hydration") return { entries: data.hydration, targetMilliliters: data.hydrationTarget };
  if (kind === "sleep") return data.sleep;
  if (kind === "workout") return data.workouts;
  if (kind === "recovery") return data.recovery;
  return null;
}

function bucket(data: DemoData, kind: string): DemoLog[] | null {
  if (kind === "meal") return data.meals;
  if (kind === "hydration") return data.hydration;
  if (kind === "sleep") return data.sleep;
  if (kind === "workout") return data.workouts;
  if (kind === "recovery") return data.recovery;
  return null;
}

export function exportDemoPayload(data: DemoData) {
  return {
    exportedAt: new Date().toISOString(),
    demo: true,
    notice: "Sample data stored in this browser. This is not a server account export.",
    account: { id: "demo-user", email: "demo@healthtrack.example", name: "Demo User" },
    profile: data.workspace.profile,
    meals: data.meals,
    hydration: data.hydration,
    sleep: data.sleep,
    workouts: data.workouts,
    recovery: data.recovery,
    cycle: data.cycle,
    wellness: assessDemoData(data),
  };
}

export function downloadDemoExport() {
  const payload = exportDemoPayload(loadDemoData());
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "healthtrack-demo-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

export async function handleDemoFetch(request: Request): Promise<Response | null> {
  const url = new URL(request.url, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  const path = url.pathname;
  if (path === "/api/demo/session" || path === "/api/v1/config" || path === "/api/coach") return null;
  if (!path.startsWith("/api/")) return null;
  const data = loadDemoData();
  const method = request.method.toUpperCase();

  if (path === "/api/health") return json({ ok: true, database: "demo" });
  if (path === "/api/v1/me/workspace" && method === "GET") return json(data.workspace);
  if (path === "/api/v1/me/workspace" && method === "PUT") {
    const body = (await request.json()) as Partial<WorkspacePayload>;
    data.workspace = { ...data.workspace, ...body, profile: body.profile ?? data.workspace.profile, scoringGoals: body.scoringGoals ?? data.workspace.scoringGoals };
    saveDemoData(data);
    return json(data.workspace);
  }
  if (path === "/api/v1/me/wellness" && method === "GET") {
    const assessment = assessDemoData(data);
    if (assessment.ok && assessment.exactScore != null && !data.scoreHistory.some((point) => point.scoreDate === assessment.provenance.scoreDate)) {
      data.scoreHistory.push({ exactScore: assessment.exactScore, scoreDate: assessment.provenance.scoreDate });
      saveDemoData(data);
    }
    return assessment.ok ? json(assessment) : error(400, "invalid_score", assessment.error);
  }
  if (path === "/api/v1/me/cycle" && method === "GET") return json(data.cycle);
  if (path === "/api/v1/me/cycle" && method === "PUT") {
    const body = (await request.json()) as Record<string, unknown>;
    const length = numberIn(body.typicalLengthDays, 15, 90);
    if (length === "invalid") return error(400, "invalid_request", "Typical cycle length must be 15–90 days, or blank.");
    data.cycle.consent = {
      enabled: body.enabled === true ? 1 : 0,
      typical_length_days: length ?? data.cycle.consent?.typical_length_days ?? 28,
      variability: String(body.variability ?? "").slice(0, 80),
      life_context: String(body.lifeContext ?? "").slice(0, 200),
    };
    saveDemoData(data);
    return json({ enabled: body.enabled === true });
  }
  if (path === "/api/v1/me/cycle" && method === "POST") {
    if (data.cycle.consent?.enabled !== 1) return error(400, "invalid_request", "Cycle tracking is off.");
    const body = (await request.json()) as Record<string, unknown>;
    const loggedOn = day(body.loggedOn);
    const kind = String(body.kind ?? "");
    if (!loggedOn || !["period", "symptom", "note"].includes(kind)) return error(400, "invalid_request", "A date and entry type are required.");
    const entry = { id: id(), logged_on: loggedOn, kind, flow: String(body.flow ?? "") || null, symptoms_json: "[]", notes: String(body.notes ?? "").slice(0, 500), created_at: new Date().toISOString() };
    data.cycle.entries = [entry, ...data.cycle.entries];
    saveDemoData(data);
    return json({ id: entry.id }, 201);
  }
  if (path === "/api/v1/me/cycle" && method === "DELETE") {
    data.cycle = { consent: null, entries: [] };
    saveDemoData(data);
    return json({ deleted: true, scope: "browser" });
  }
  if (path === "/api/v1/me/health-data" && method === "DELETE") {
    data.meals = [];
    data.hydration = [];
    data.sleep = [];
    data.workouts = [];
    data.recovery = [];
    data.cycle = { consent: null, entries: [] };
    data.scoreHistory = [];
    saveDemoData(data);
    return json({ deleted: true, scope: "browser" });
  }
  if (path === "/api/v1/me/export" && method === "GET") {
    return new Response(JSON.stringify(exportDemoPayload(data), null, 2), {
      headers: { "content-type": "application/json", "content-disposition": "attachment; filename=healthtrack-demo-export.json" },
    });
  }
  if (path === "/api/v1/me/logs" && method === "GET") {
    const kind = url.searchParams.get("kind") ?? "";
    const records = listKind(data, kind);
    if (!records) return error(400, "invalid_request", "kind must be meal, hydration, sleep, workout, or recovery.");
    return json({ kind, records });
  }
  if (path === "/api/v1/me/logs" && method === "POST") {
    const kind = url.searchParams.get("kind") ?? "";
    const body = (await request.json()) as Record<string, unknown>;
    const saved = applyLog(data, kind, body);
    if (!saved.ok) return error(400, "invalid_request", saved.message);
    saveDemoData(data);
    return json(saved.id === "target" ? { milliliters: data.hydrationTarget } : { id: saved.id }, 201);
  }
  const logItem = /^\/api\/v1\/me\/logs\/([^/]+)$/.exec(path);
  if (logItem && (method === "PATCH" || method === "DELETE")) {
    const kind = url.searchParams.get("kind") ?? "";
    const rows = bucket(data, kind);
    if (!rows) return error(400, "invalid_request", "kind is required.");
    const recordId = decodeURIComponent(logItem[1] ?? "");
    if (!rows.some((row) => row.id === recordId)) return error(404, "not_found", "Record was not found in this browser.");
    if (method === "DELETE") {
      const next = rows.filter((row) => row.id !== recordId);
      if (kind === "meal") data.meals = next;
      if (kind === "hydration") data.hydration = next;
      if (kind === "sleep") data.sleep = next;
      if (kind === "workout") data.workouts = next;
      if (kind === "recovery") data.recovery = next;
      saveDemoData(data);
      return json({ deleted: true });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const saved = applyLog(data, kind, body, recordId);
    if (!saved.ok) return error(400, "invalid_request", saved.message);
    saveDemoData(data);
    return json({ id: saved.id });
  }
  if (path === "/api/auth/sign-out") return json({ ok: true, demo: true });
  if (path.startsWith("/api/auth/")) {
    return error(400, "demo_auth", "This demo does not create accounts or send email. Use Explore Demo.");
  }
  if (path.startsWith("/api/v1/pairing-sessions") || path.startsWith("/api/v1/devices") || path.startsWith("/api/v1/measurements")) {
    return error(404, "demo_unavailable", "Companion pairing is unavailable in the demo.");
  }
  return error(404, "demo_unavailable", "That action is unavailable in the demo.");
}

let installed = false;

export function installDemoFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const handled = await handleDemoFetch(request);
    if (handled) return handled;
    return original(input, init);
  };
}
