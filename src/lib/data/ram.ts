import { RAM_LAB_REPORTS } from "@/lib/data/labs";
import { DEMO_TODAY } from "@/lib/metrics";
import { EMPTY_SCORING_GOALS, EMPTY_STARTING_BASELINES } from "@/lib/types";
import type {
  AdherenceEvent,
  ConnectedSource,
  ConsentChoices,
  DemoState,
  Profile,
  WatchState,
} from "@/lib/types";

function disconnectedWatch(): WatchState {
  return {
    connected: false,
    status: "disconnected",
    lastSyncAt: null,
    batteryPct: 0,
    failNextSync: false,
    notice: null,
  };
}

export const RAM_PROFILE: Profile = {
  displayName: "Ram Chen",
  age: 44,
  sex: "male",
  heightCm: 178,
  weightKg: 82,
  goals: ["Sleep consistency", "Recovery", "Metabolic wellness"],
  dietaryPreferences: ["Omnivore", "Lower evening carbs when convenient"],
  restrictions: [],
  allergies: [],
  medications: "Vitamin D 2000 IU (supplement)",
  typicalBedtime: "22:30",
  typicalWake: "06:15",
  typicalDinner: "19:30",
  workPattern: "Knowledge work, occasional late meetings",
  stressContext: "Deadline-heavy week, kids' school events",
  coachingTone: "direct",
  notifications: true,
  timezone: "America/New_York",
};

export const RAM_CONSENTS: ConsentChoices = {
  wearables: true,
  labs: true,
  coaching: true,
  productAnalytics: false,
};

export const SOURCE_CATALOG: ConnectedSource[] = [
  {
    kind: "oura",
    label: "Oura",
    connected: true,
    lastSync: `${DEMO_TODAY}T07:12:00Z`,
    coverage30d: 0.93,
    permissions: ["sleep", "recovery", "activity"],
    simulated: true,
  },
  {
    kind: "apple_health",
    label: "Apple Health",
    connected: true,
    lastSync: `${DEMO_TODAY}T07:18:00Z`,
    coverage30d: 0.97,
    permissions: ["heart", "steps", "workouts"],
    simulated: true,
  },
  {
    kind: "whoop",
    label: "WHOOP",
    connected: false,
    lastSync: null,
    coverage30d: null,
    permissions: ["strain", "recovery", "sleep"],
    simulated: true,
  },
  {
    kind: "garmin",
    label: "Garmin",
    connected: false,
    lastSync: null,
    coverage30d: null,
    permissions: ["activity", "heart"],
    simulated: true,
  },
  {
    kind: "fitbit",
    label: "Fitbit",
    connected: false,
    lastSync: null,
    coverage30d: null,
    permissions: ["activity", "sleep"],
    simulated: true,
  },
  {
    kind: "manual",
    label: "Manual check-ins",
    connected: true,
    lastSync: `${DEMO_TODAY}T08:02:00Z`,
    coverage30d: 0.8,
    permissions: ["energy", "stress", "meals"],
    simulated: true,
  },
];

export const DISCONNECTED_SOURCES: ConnectedSource[] = SOURCE_CATALOG.map(
  (source) => ({
    ...source,
    connected: source.kind === "manual",
    lastSync: source.kind === "manual" ? `${DEMO_TODAY}T08:02:00Z` : null,
    coverage30d: source.kind === "manual" ? 0.2 : null,
  }),
);

function historicalAdherence(): AdherenceEvent[] {
  const walkDays = [
    "2026-09-07",
    "2026-09-09",
    "2026-09-12",
    "2026-09-14",
    "2026-09-16",
    "2026-09-19",
    "2026-09-21",
    "2026-09-23",
    "2026-09-26",
    "2026-09-28",
    "2026-09-30",
    "2026-10-03",
    "2026-10-05",
    "2026-10-07",
    "2026-10-10",
  ];
  const events: AdherenceEvent[] = [];
  for (const date of walkDays) {
    events.push({
      id: `acc-${date}`,
      date,
      behaviorId: "evening-walk",
      kind: "accepted",
    });
    events.push({
      id: `done-${date}`,
      date,
      behaviorId: "evening-walk",
      kind: "completed",
    });
  }
  events.push(
    {
      id: "miss-2026-09-18",
      date: "2026-09-18",
      behaviorId: "evening-walk",
      kind: "missed",
      reason: "Late meeting",
    },
    {
      id: "snooze-2026-10-02",
      date: "2026-10-02",
      behaviorId: "screens-off",
      kind: "snoozed",
      reason: "Travel",
    },
    {
      id: "done-bed-2026-09-11",
      date: "2026-09-11",
      behaviorId: "normal-bedtime",
      kind: "completed",
    },
    {
      id: "done-bed-2026-09-25",
      date: "2026-09-25",
      behaviorId: "normal-bedtime",
      kind: "completed",
    },
  );
  return events;
}

export function createRamState(): DemoState {
  return {
    version: 2,
    mode: "ram",
    onboardingComplete: true,
    onboardingStep: 11,
    profile: RAM_PROFILE,
    startingBaselines: { ...EMPTY_STARTING_BASELINES },
    scoringGoals: { ...EMPTY_SCORING_GOALS, sources: { ...EMPTY_SCORING_GOALS.sources } },
    consents: RAM_CONSENTS,
    sources: SOURCE_CATALOG,
    labReports: RAM_LAB_REPORTS,
    context: {
      travel: false,
      illness: false,
      unusualSchedule: true,
      menstrualNoted: false,
    },
    todayEnergy: 6.2,
    todayStress: 5.6,
    todayCommitment: {
      date: DEMO_TODAY,
      behaviorId: "normal-bedtime",
      decision: "pending",
    },
    adherence: historicalAdherence(),
    snoozedBehaviorIds: [],
    declinedBehaviorIds: [],
    coachMessages: [],
    reflection: {
      weekOf: "2026-10-12",
      energy: 6,
      stress: 6,
      note: "Late dinners and a packed calendar. Walking still feels doable; bedtime has slipped.",
      savedAt: "2026-10-12T21:14:00Z",
    },
    enteredAt: `${DEMO_TODAY}T17:02:00Z`,
    watch: disconnectedWatch(),
    watchImports: [],
    syncHistory: [],
    persistedObservations: [],
    dataAsOf: DEMO_TODAY,
    nowIso: `${DEMO_TODAY}T18:40:00Z`,
    devices: [],
  };
}

export function createBlankCustomState(): DemoState {
  return {
    version: 2,
    mode: "custom",
    onboardingComplete: false,
    onboardingStep: 0,
    profile: {
      displayName: "",
      age: 35,
      sex: "prefer_not_to_say",
      heightCm: 170,
      weightKg: 70,
      goals: [],
      dietaryPreferences: [],
      restrictions: [],
      allergies: [],
      medications: "",
      typicalBedtime: "22:30",
      typicalWake: "06:30",
      typicalDinner: "19:30",
      workPattern: "",
      stressContext: "",
      coachingTone: "gentle",
      notifications: true,
      timezone: "UTC",
    },
    startingBaselines: { ...EMPTY_STARTING_BASELINES },
    scoringGoals: { ...EMPTY_SCORING_GOALS, sources: { ...EMPTY_SCORING_GOALS.sources } },
    consents: {
      wearables: false,
      labs: false,
      coaching: true,
      productAnalytics: false,
    },
    sources: DISCONNECTED_SOURCES,
    labReports: [],
    context: {
      travel: false,
      illness: false,
      unusualSchedule: false,
      menstrualNoted: false,
    },
    todayEnergy: null,
    todayStress: null,
    todayCommitment: null,
    adherence: [],
    snoozedBehaviorIds: [],
    declinedBehaviorIds: [],
    coachMessages: [],
    reflection: null,
    enteredAt: null,
    watch: disconnectedWatch(),
    watchImports: [],
    syncHistory: [],
    persistedObservations: [],
    dataAsOf: DEMO_TODAY,
    nowIso: `${DEMO_TODAY}T18:40:00Z`,
    devices: [],
  };
}

export const EMPTY_CUSTOM_PROFILE_DEFAULTS: Profile = createBlankCustomState().profile;
