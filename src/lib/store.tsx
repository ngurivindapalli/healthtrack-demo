"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { createBlankCustomState } from "@/lib/data/ram";
import { buildAppModel, type AppModel } from "@/lib/engines/view-model";
import { authClient } from "@/lib/auth-client";
import { answerCoach, seedCoachWelcome } from "@/lib/services/coach";
import type { WorkspacePayload } from "@/lib/services/workspace";
import { EMPTY_SCORING_GOALS, EMPTY_STARTING_BASELINES, type CoachMessage, type DemoState, type Profile } from "@/lib/types";

interface StoreValue {
  state: DemoState;
  model: AppModel;
  ready: boolean;
  signedIn: boolean;
  resetDemo: () => Promise<void>;
  deleteHealthData: () => Promise<void>;
  patchState: (patch: Partial<DemoState>) => void;
  patchProfile: (patch: Partial<Profile>) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  setCommitment: (
    decision: NonNullable<DemoState["todayCommitment"]>["decision"],
    extra?: { reason?: string; replacedWithId?: string },
  ) => void;
  saveReflection: (note: string, energy: number, stress: number) => void;
  askCoach: (question: string) => Promise<void>;
  setContext: (patch: Partial<DemoState["context"]>) => void;
  setCheckIn: (energy: number, stress: number) => void;
  logAdherence: (behaviorId: string, kind: "completed" | "accepted") => void;
  createPairingCode: () => Promise<{ code: string; expiresAt: string } | { error: string }>;
  revokeDevice: (deviceId: string) => Promise<void>;
  rateCoach: (messageId: string, feedback: "useful" | "not_useful") => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function accountState(): DemoState {
  return { ...createBlankCustomState(), mode: "account" };
}

function applyWorkspace(payload: WorkspacePayload): DemoState {
  const base = accountState();
  return {
    ...base,
    mode: "account",
    onboardingComplete: payload.onboardingComplete,
    onboardingStep: payload.onboardingStep,
    profile: payload.profile,
    startingBaselines: payload.startingBaselines ?? { ...EMPTY_STARTING_BASELINES },
    scoringGoals: payload.scoringGoals ?? { ...EMPTY_SCORING_GOALS, sources: { ...EMPTY_SCORING_GOALS.sources } },
    consents: payload.consents,
    context: payload.context,
    todayEnergy: payload.todayEnergy,
    todayStress: payload.todayStress,
    todayCommitment: payload.todayCommitment as DemoState["todayCommitment"],
    adherence: payload.adherence as DemoState["adherence"],
    snoozedBehaviorIds: payload.snoozedBehaviorIds,
    declinedBehaviorIds: payload.declinedBehaviorIds,
    coachMessages: payload.coachMessages as DemoState["coachMessages"],
    reflection: payload.reflection as DemoState["reflection"],
    devices: payload.devices,
    persistedObservations: payload.observations,
    dataAsOf: payload.dataAsOf,
    nowIso: payload.nowIso,
    enteredAt: payload.nowIso,
  };
}

const SERVER_SNAPSHOT = accountState();
let clientState: DemoState = SERVER_SNAPSHOT;
let signedIn = false;
let hydrated = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function readClientState(): DemoState {
  return clientState;
}

function scheduleSave() {
  if (typeof window === "undefined" || !hydrated || !signedIn) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void pushWorkspace();
  }, 400);
}

export async function flushWorkspace() {
  if (typeof window === "undefined" || !hydrated || !signedIn) return false;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  return pushWorkspace();
}

async function pushWorkspace() {
  const state = clientState;
  const response = await fetch("/api/v1/me/workspace", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      profile: state.profile,
      startingBaselines: state.startingBaselines,
      scoringGoals: state.scoringGoals,
      consents: state.consents,
      onboardingComplete: state.onboardingComplete,
      onboardingStep: state.onboardingStep,
      context: state.context,
      todayEnergy: state.todayEnergy,
      todayStress: state.todayStress,
      todayCommitment: state.todayCommitment,
      adherence: state.adherence,
      snoozedBehaviorIds: state.snoozedBehaviorIds,
      declinedBehaviorIds: state.declinedBehaviorIds,
      coachMessages: state.coachMessages,
      reflection: state.reflection,
    }),
  });
  return response.ok;
}

export async function refreshWorkspace() {
  const response = await fetch("/api/v1/me/workspace");
  if (response.status === 401) {
    signedIn = false;
    hydrated = true;
    clientState = accountState();
    emit();
    return;
  }
  if (!response.ok) return;
  signedIn = true;
  clientState = applyWorkspace((await response.json()) as WorkspacePayload);
  hydrated = true;
  emit();
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(updater: DemoState | ((prev: DemoState) => DemoState)) {
  const prev = typeof window === "undefined" ? SERVER_SNAPSHOT : readClientState();
  clientState = typeof updater === "function" ? updater(prev) : updater;
  scheduleSave();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, readClientState, () => SERVER_SNAPSHOT);
  const ready = useSyncExternalStore(subscribe, () => hydrated, () => false);
  const signedInNow = useSyncExternalStore(subscribe, () => signedIn, () => false);
  useEffect(() => {
    void refreshWorkspace();
  }, []);

  const model = useMemo(() => buildAppModel(state), [state]);

  const patchState = useCallback((patch: Partial<DemoState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDemo = useCallback(async () => {
    await authClient.signOut();
    signedIn = false;
    hydrated = true;
    clientState = accountState();
    emit();
  }, []);

  const deleteHealthData = useCallback(async () => {
    await fetch("/api/v1/me/health-data", { method: "DELETE" });
    await refreshWorkspace();
  }, []);

  const patchProfile = useCallback((patch: Partial<Profile>) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  }, []);

  const setOnboardingStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, onboardingStep: step }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      onboardingComplete: true,
      onboardingStep: 14,
      enteredAt: prev.nowIso,
    }));
  }, []);

  const setCommitment = useCallback(
    (
      decision: NonNullable<DemoState["todayCommitment"]>["decision"],
      extra?: { reason?: string; replacedWithId?: string },
    ) => {
      setState((prev) => {
        const behaviorId =
          extra?.replacedWithId ??
          prev.todayCommitment?.behaviorId ??
          "normal-bedtime";
        const event = {
          id: `${decision}-${prev.dataAsOf}-${behaviorId}`,
          date: prev.dataAsOf,
          behaviorId,
          kind:
            decision === "completed"
              ? ("completed" as const)
              : decision === "accepted"
                ? ("accepted" as const)
                : decision === "declined"
                  ? ("declined" as const)
                  : decision === "snoozed"
                    ? ("snoozed" as const)
                    : decision === "replaced"
                      ? ("replaced" as const)
                      : ("missed" as const),
          reason: extra?.reason,
        };
        return {
          ...prev,
          todayCommitment: {
            date: prev.dataAsOf,
            behaviorId,
            decision,
            replacedWithId: extra?.replacedWithId,
            reason: extra?.reason,
            completedAt: decision === "completed" ? prev.nowIso : undefined,
          },
          snoozedBehaviorIds:
            decision === "snoozed"
              ? Array.from(new Set([...prev.snoozedBehaviorIds, behaviorId]))
              : prev.snoozedBehaviorIds,
          declinedBehaviorIds:
            decision === "declined"
              ? Array.from(new Set([...prev.declinedBehaviorIds, behaviorId]))
              : prev.declinedBehaviorIds,
          adherence: [
            ...prev.adherence.filter((item) => item.id !== event.id),
            event,
          ],
        };
      });
    },
    [],
  );

  const saveReflection = useCallback(
    (note: string, energy: number, stress: number) => {
      setState((prev) => ({
        ...prev,
        reflection: {
          weekOf: prev.dataAsOf,
          energy,
          stress,
          note,
          savedAt: prev.nowIso,
        },
      }));
    },
    [],
  );

  const setContext = useCallback((patch: Partial<DemoState["context"]>) => {
    setState((prev) => ({ ...prev, context: { ...prev.context, ...patch } }));
  }, []);

  const setCheckIn = useCallback((energy: number, stress: number) => {
    setState((prev) => ({ ...prev, todayEnergy: energy, todayStress: stress }));
  }, []);

  const logAdherence = useCallback(
    (behaviorId: string, kind: "completed" | "accepted") => {
      setState((prev) => ({
        ...prev,
        adherence: [
          ...prev.adherence,
          {
            id: `${kind}-${prev.dataAsOf}-${behaviorId}-${Date.now()}`,
            date: prev.dataAsOf,
            behaviorId,
            kind,
          },
        ],
      }));
    },
    [],
  );

  const createPairingCode = useCallback(async () => {
    const response = await fetch("/api/v1/pairing-sessions", { method: "POST" });
    const body = (await response.json()) as { code?: string; expiresAt?: string; error?: { message?: string } };
    if (!response.ok || !body.code || !body.expiresAt) {
      return { error: body.error?.message ?? "Could not create a pairing code." };
    }
    return { code: body.code, expiresAt: body.expiresAt };
  }, []);

  const revokeDevice = useCallback(async (deviceId: string) => {
    await fetch(`/api/v1/devices/${deviceId}`, { method: "DELETE" });
    await refreshWorkspace();
  }, []);

  const rateCoach = useCallback((messageId: string, feedback: "useful" | "not_useful") => {
    setState((prev) => ({
      ...prev,
      coachMessages: prev.coachMessages.map((message) =>
        message.id === messageId ? { ...message, feedback } : message,
      ),
    }));
  }, []);

  const askCoach = useCallback(
    async (question: string) => {
      const userMsg: CoachMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: question,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        coachMessages: [...prev.coachMessages, userMsg],
      }));

      let reply = answerCoach(question, state, model);
      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question,
            fallback: reply,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { content?: string; usedLiveModel?: boolean };
          if (data.content) {
            reply = {
              ...reply,
              content: data.content,
              sources: data.usedLiveModel
                ? [...reply.sources, "Optional live model wording"]
                : reply.sources,
            };
          }
        }
      } catch {
        // Local engine is the source of truth.
      }

      const coachMsg: CoachMessage = {
        id: `c-${Date.now()}`,
        role: "coach",
        content: reply.content,
        createdAt: new Date().toISOString(),
        sources: reply.sources,
        safetyFlag: reply.safetyFlag,
      };
      setState((prev) => ({
        ...prev,
        coachMessages: [...prev.coachMessages, coachMsg],
      }));
    },
    [model, state],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      model,
      ready,
      signedIn: signedInNow,
      resetDemo,
      deleteHealthData,
      patchState,
      patchProfile,
      setOnboardingStep,
      completeOnboarding,
      setCommitment,
      saveReflection,
      askCoach,
      setContext,
      setCheckIn,
      logAdherence,
      createPairingCode,
      revokeDevice,
      rateCoach,
    }),
    [
      state,
      model,
      ready,
      signedInNow,
      resetDemo,
      deleteHealthData,
      patchState,
      patchProfile,
      setOnboardingStep,
      completeOnboarding,
      setCommitment,
      saveReflection,
      askCoach,
      setContext,
      setCheckIn,
      logAdherence,
      createPairingCode,
      revokeDevice,
      rateCoach,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}

export function welcomeIfEmpty(messages: CoachMessage[], model: AppModel) {
  if (messages.length > 0) return messages;
  return [seedCoachWelcome(model)];
}
