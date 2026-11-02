import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { observationsForUser } from "@/lib/services/measurements";
import {
  DEFAULT_CONSENTS,
  listDevices,
  localDate,
  readProfile,
  rowToProfile,
  sanitizeBaselines,
  sanitizeScoringGoals,
  sanitizeProfile,
  saveProfile,
  type WorkspacePayload,
} from "@/lib/services/workspace";
import type { ConsentChoices, ContextFlags } from "@/lib/types";

export const runtime = "nodejs";

const EMPTY_CONTEXT: ContextFlags = {
  travel: false,
  illness: false,
  unusualSchedule: false,
  menstrualNoted: false,
};

export async function GET() {
  const user = await requireUser();
  if (!user) return apiError(401, "unauthorized", "Sign in required.");
  const { client } = await getDatabase();
  const row = await readProfile(client, user.id);
  if (!row) return apiError(404, "profile_missing", "Profile was not created for this account.");
  const profile = rowToProfile(row);
  const now = new Date();
  const workspace = JSON.parse(row.workspace_json || "{}") as Partial<WorkspacePayload>;
  const payload: WorkspacePayload = {
    profile,
    startingBaselines: sanitizeBaselines(workspace.startingBaselines ?? {}),
    scoringGoals: sanitizeScoringGoals(workspace.scoringGoals),
    consents: { ...DEFAULT_CONSENTS, ...(JSON.parse(row.consents_json || "{}") as ConsentChoices) },
    onboardingComplete: row.onboarding_complete === 1,
    onboardingStep: row.onboarding_step,
    context: { ...EMPTY_CONTEXT, ...(workspace.context ?? {}) },
    todayEnergy: typeof workspace.todayEnergy === "number" ? workspace.todayEnergy : null,
    todayStress: typeof workspace.todayStress === "number" ? workspace.todayStress : null,
    todayCommitment: workspace.todayCommitment ?? null,
    adherence: Array.isArray(workspace.adherence) ? workspace.adherence : [],
    snoozedBehaviorIds: Array.isArray(workspace.snoozedBehaviorIds) ? workspace.snoozedBehaviorIds : [],
    declinedBehaviorIds: Array.isArray(workspace.declinedBehaviorIds) ? workspace.declinedBehaviorIds : [],
    coachMessages: Array.isArray(workspace.coachMessages) ? workspace.coachMessages.slice(-40) : [],
    reflection: workspace.reflection ?? null,
    devices: await listDevices(client, user.id),
    observations: await observationsForUser(client, user.id, profile.timezone),
    dataAsOf: localDate(now.toISOString(), profile.timezone),
    nowIso: now.toISOString(),
  };
  return NextResponse.json(payload);
}

export async function PUT(request: Request) {
  const user = await requireUser();
  if (!user) return apiError(401, "unauthorized", "Sign in required.");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > 200_000) return apiError(413, "payload_too_large", "Workspace request is too large.");
  const text = await request.text();
  if (text.length > 200_000) return apiError(413, "payload_too_large", "Workspace request is too large.");
  let body: Partial<WorkspacePayload>;
  try {
    body = JSON.parse(text) as Partial<WorkspacePayload>;
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }
  const { client } = await getDatabase();
  const row = await readProfile(client, user.id);
  if (!row) return apiError(404, "profile_missing", "Profile was not created for this account.");
  const profile = sanitizeProfile(body.profile ?? {}, rowToProfile(row));
  const consents = {
    ...DEFAULT_CONSENTS,
    ...(body.consents ?? {}),
  };
  const workspace = {
    startingBaselines: sanitizeBaselines(body.startingBaselines),
    scoringGoals: sanitizeScoringGoals(body.scoringGoals),
    context: body.context ?? EMPTY_CONTEXT,
    todayEnergy: typeof body.todayEnergy === "number" ? body.todayEnergy : null,
    todayStress: typeof body.todayStress === "number" ? body.todayStress : null,
    todayCommitment: body.todayCommitment ?? null,
    adherence: Array.isArray(body.adherence) ? body.adherence.slice(-200) : [],
    snoozedBehaviorIds: Array.isArray(body.snoozedBehaviorIds) ? body.snoozedBehaviorIds.slice(0, 40) : [],
    declinedBehaviorIds: Array.isArray(body.declinedBehaviorIds) ? body.declinedBehaviorIds.slice(0, 40) : [],
    coachMessages: Array.isArray(body.coachMessages) ? body.coachMessages.slice(-40) : [],
    reflection: body.reflection ?? null,
  };
  await saveProfile(client, user.id, profile, {
    consents,
    onboardingComplete: Boolean(body.onboardingComplete),
    onboardingStep: Math.max(0, Math.min(20, Number(body.onboardingStep) || 0)),
    workspaceJson: JSON.stringify(workspace),
  });
  return NextResponse.json({ ok: true });
}
