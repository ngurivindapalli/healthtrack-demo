"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { SAMPLE_UPLOAD_REPORT } from "@/lib/data/labs";
import {
  createBlankCustomState,
  createRamState,
} from "@/lib/data/ram";
import { buildAppModel, type AppModel } from "@/lib/engines/view-model";
import { DEMO_NOW, DEMO_TODAY } from "@/lib/metrics";
import { answerCoach, seedCoachWelcome } from "@/lib/services/coach";
import {
  applyFailedSync,
  applySuccessfulSync,
  applyUpToDateSync,
  coerceWatchStatus,
  planSync,
  sleep,
  upsertWatchSource,
} from "@/lib/services/wearable";
import type {
  CoachMessage,
  DemoState,
  Profile,
} from "@/lib/types";

const STORAGE_KEY = "healthtrack.demo.v1";

interface StoreValue {
  state: DemoState;
  model: AppModel;
  ready: boolean;
  enterRam: () => void;
  startCustom: () => void;
  resetDemo: () => void;
  patchState: (patch: Partial<DemoState>) => void;
  patchProfile: (patch: Partial<Profile>) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  toggleSource: (kind: DemoState["sources"][number]["kind"]) => void;
  addSampleLabUpload: (filename?: string) => void;
  setCommitment: (
    decision: NonNullable<DemoState["todayCommitment"]>["decision"],
    extra?: { reason?: string; replacedWithId?: string },
  ) => void;
  saveReflection: (note: string, energy: number, stress: number) => void;
  askCoach: (question: string) => Promise<void>;
  setContext: (patch: Partial<DemoState["context"]>) => void;
  setCheckIn: (energy: number, stress: number) => void;
  logAdherence: (behaviorId: string, kind: "completed" | "accepted") => void;
  connectWatch: () => Promise<void>;
  disconnectWatch: () => void;
  syncWatch: (force?: boolean) => Promise<void>;
  armSyncFailure: () => void;
  dismissWatchNotice: () => void;
  rateCoach: (messageId: string, feedback: "useful" | "not_useful") => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function normalizeState(parsed: unknown): DemoState | null {
  if (!parsed || typeof parsed !== "object") return null;
  const raw = parsed as Partial<DemoState> & { version?: number };
  const version = (parsed as { version?: number }).version;
  if (version !== 1 && version !== 2) return null;
  const base = raw.mode === "custom" ? createBlankCustomState() : createRamState();
  return {
    ...base,
    ...raw,
    version: 2,
    watch: coerceWatchStatus({
      ...base.watch,
      ...(raw.watch ?? {}),
    }),
    watchImports: raw.watchImports ?? [],
    syncHistory: raw.syncHistory ?? [],
  };
}

function loadState(): DemoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function persist(state: DemoState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const SERVER_SNAPSHOT = createRamState();
let clientState: DemoState = SERVER_SNAPSHOT;
let storageRead = false;
const listeners = new Set<() => void>();

function readClientState(): DemoState {
  if (!storageRead) {
    storageRead = true;
    clientState = loadState() ?? createRamState();
  }
  return clientState;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(updater: DemoState | ((prev: DemoState) => DemoState)) {
  const prev = typeof window === "undefined" ? SERVER_SNAPSHOT : readClientState();
  clientState = typeof updater === "function" ? updater(prev) : updater;
  if (typeof window !== "undefined") persist(clientState);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, readClientState, () => SERVER_SNAPSHOT);
  const ready = true;

  const model = useMemo(() => buildAppModel(state), [state]);

  const patchState = useCallback((patch: Partial<DemoState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const enterRam = useCallback(() => {
    setState(createRamState());
  }, []);

  const startCustom = useCallback(() => {
    setState(createBlankCustomState());
  }, []);

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(createRamState());
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
      onboardingStep: 11,
      enteredAt: `${DEMO_TODAY}T12:00:00Z`,
      todayCommitment: prev.todayCommitment ?? {
        date: DEMO_TODAY,
        behaviorId: "normal-bedtime",
        decision: "pending",
      },
    }));
  }, []);

  const toggleSource = useCallback((kind: DemoState["sources"][number]["kind"]) => {
    setState((prev) => ({
      ...prev,
      sources: prev.sources.map((source) =>
        source.kind === kind
          ? {
              ...source,
              connected: !source.connected,
              lastSync: !source.connected ? `${DEMO_TODAY}T12:04:00Z` : null,
              coverage30d: !source.connected ? 0.9 : null,
            }
          : source,
      ),
    }));
  }, []);

  const addSampleLabUpload = useCallback((filename?: string) => {
    setState((prev) => {
      if (prev.labReports.some((report) => report.id === SAMPLE_UPLOAD_REPORT.id)) {
        return prev;
      }
      return {
        ...prev,
        labReports: [
          ...prev.labReports,
          { ...SAMPLE_UPLOAD_REPORT, filename: filename || SAMPLE_UPLOAD_REPORT.filename },
        ],
      };
    });
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
          id: `${decision}-${DEMO_TODAY}-${behaviorId}`,
          date: DEMO_TODAY,
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
            date: DEMO_TODAY,
            behaviorId,
            decision,
            replacedWithId: extra?.replacedWithId,
            reason: extra?.reason,
            completedAt: decision === "completed" ? `${DEMO_TODAY}T20:15:00Z` : undefined,
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
          weekOf: "2026-10-12",
          energy,
          stress,
          note,
          savedAt: `${DEMO_TODAY}T18:00:00Z`,
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
            id: `${kind}-${DEMO_TODAY}-${behaviorId}-${Date.now()}`,
            date: DEMO_TODAY,
            behaviorId,
            kind,
          },
        ],
      }));
    },
    [],
  );

  const connectWatch = useCallback(async () => {
    const current = readClientState();
    if (current.watch.connected || current.watch.status === "connecting") return;
    setState((prev) => ({
      ...prev,
      watch: { ...prev.watch, status: "connecting", notice: null },
    }));
    await sleep(700);
    setState((prev) => ({
      ...prev,
      watch: {
        ...prev.watch,
        connected: true,
        status: "connected",
        notice: {
          kind: "success",
          message:
            "Pulse Watch connected. This is a simulated Junction link — no Bluetooth, OAuth, or vendor credentials.",
        },
      },
      sources: upsertWatchSource(prev.sources, true, prev.watch.lastSyncAt),
    }));
  }, []);

  const disconnectWatch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      watch: {
        ...prev.watch,
        connected: false,
        status: "disconnected",
        notice: {
          kind: "info",
          message:
            "Pulse Watch disconnected. Imported readings remain until you reset the demo.",
        },
      },
      sources: upsertWatchSource(prev.sources, false, prev.watch.lastSyncAt),
    }));
  }, []);

  const syncWatch = useCallback(async (force = false) => {
    const current = readClientState();
    if (current.watch.status === "syncing") return;
    let plan = planSync(current, DEMO_NOW);
    if (plan.kind === "up_to_date" && force) {
      plan = {
        kind: "catch-up",
        message: "Refreshed today’s Pulse Watch readings in place.",
      };
    }
    if (plan.kind === "blocked") {
      setState((prev) => ({
        ...prev,
        watch: {
          ...prev.watch,
          notice: { kind: "error", message: plan.message },
        },
      }));
      return;
    }
    setState((prev) => ({
      ...prev,
      watch: { ...prev.watch, status: "syncing", notice: null },
    }));
    await sleep(1100);
    setState((prev) => {
      if (plan.kind === "failed") {
        return { ...prev, ...applyFailedSync(prev, DEMO_NOW, plan.message) };
      }
      if (plan.kind === "up_to_date") {
        return { ...prev, ...applyUpToDateSync(prev, DEMO_NOW, plan.message) };
      }
      if (plan.kind !== "history" && plan.kind !== "catch-up") {
        return prev;
      }
      const successPlan = {
        kind: plan.kind,
        message: plan.message,
      };
      const existing = buildAppModel(prev).observations;
      return {
        ...prev,
        ...applySuccessfulSync(prev, existing, DEMO_NOW, successPlan),
      };
    });
  }, []);

  const armSyncFailure = useCallback(() => {
    setState((prev) => ({
      ...prev,
      watch: {
        ...prev.watch,
        failNextSync: true,
        notice: {
          kind: "info",
          message: "The next sync will simulate an ingest failure. Stored readings will be left unchanged.",
        },
      },
    }));
  }, []);

  const rateCoach = useCallback((messageId: string, feedback: "useful" | "not_useful") => {
    setState((prev) => ({
      ...prev,
      coachMessages: prev.coachMessages.map((message) =>
        message.id === messageId ? { ...message, feedback } : message,
      ),
    }));
  }, []);

  const dismissWatchNotice = useCallback(() => {
    setState((prev) => ({
      ...prev,
      watch: { ...prev.watch, notice: null },
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
      enterRam,
      startCustom,
      resetDemo,
      patchState,
      patchProfile,
      setOnboardingStep,
      completeOnboarding,
      toggleSource,
      addSampleLabUpload,
      setCommitment,
      saveReflection,
      askCoach,
      setContext,
      setCheckIn,
      logAdherence,
      connectWatch,
      disconnectWatch,
      syncWatch,
      armSyncFailure,
      dismissWatchNotice,
      rateCoach,
    }),
    [
      state,
      model,
      ready,
      enterRam,
      startCustom,
      resetDemo,
      patchState,
      patchProfile,
      setOnboardingStep,
      completeOnboarding,
      toggleSource,
      addSampleLabUpload,
      setCommitment,
      saveReflection,
      askCoach,
      setContext,
      setCheckIn,
      logAdherence,
      connectWatch,
      disconnectWatch,
      syncWatch,
      armSyncFailure,
      dismissWatchNotice,
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
