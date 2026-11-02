export type Sex = "female" | "male" | "other" | "prefer_not_to_say";

export type WellnessState =
  | "thriving"
  | "stable"
  | "shifting"
  | "needs_attention";

export type BaselineConfidence = "building" | "moderate" | "established";

export type Direction = "up" | "down" | "flat";

export type PillarId = "sleep" | "recovery" | "nutrition" | "activity" | "labs";

export type BetterDirection = "higher" | "lower";

export type DataSourceKind =
  | "oura"
  | "apple_health"
  | "whoop"
  | "garmin"
  | "fitbit"
  | "manual"
  | "watch"
  | "companion";

export type WatchLinkStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "syncing";

export type FreshnessKind =
  | "never"
  | "up_to_date"
  | "needs_update"
  | "syncing"
  | "disconnected";

export type SyncAttemptStatus = "success" | "up_to_date" | "failed";

export type DemoMode = "unstarted" | "ram" | "custom" | "account";

export type CommitmentDecision =
  | "pending"
  | "accepted"
  | "declined"
  | "snoozed"
  | "replaced"
  | "completed"
  | "missed";

export type AssociationDirection = "positive" | "negative" | "uncertain" | "none";

export type CoachRole = "user" | "coach" | "system";

export type MetricId =
  | "sleepHours"
  | "sleepEfficiency"
  | "bedtimeMinutes"
  | "rhr"
  | "hrv"
  | "steps"
  | "activeMinutes"
  | "energy"
  | "stress"
  | "lastMealHour";

export interface MetricDefinition {
  id: MetricId;
  label: string;
  shortLabel: string;
  unit: string;
  pillar: Exclude<PillarId, "labs">;
  better: BetterDirection;
  domainWeight: number;
  format: (value: number) => string;
}

export interface DailyObservation {
  date: string;
  sleepHours: number | null;
  sleepEfficiency: number | null;
  bedtimeMinutes: number | null;
  rhr: number | null;
  hrv: number | null;
  steps: number | null;
  activeMinutes: number | null;
  energy: number | null;
  stress: number | null;
  lastMealHour: number | null;
  proteinBreakfast: boolean | null;
  eveningWalkMinutes: number | null;
  sources: DataSourceKind[];
  travel: boolean;
  illness: boolean;
  unusualSchedule: boolean;
}

export interface BaselineStat {
  metricId: MetricId;
  median: number;
  mad: number;
  sampleDays: number;
  validRatio: number;
}

export interface MetricSnapshot {
  metricId: MetricId;
  latest: number | null;
  recentMean: number | null;
  baseline: BaselineStat | null;
  percentVsBaseline: number | null;
  robustZ: number | null;
  direction: Direction;
  worseForWellness: boolean;
  reliability: number;
  persistenceDays: number;
  peerReference: number | null;
  generalReference: string | null;
}

export interface DomainScore {
  pillar: Exclude<PillarId, "labs">;
  deviation: number;
  persistence: number;
  reliability: number;
  drivers: MetricSnapshot[];
}

export interface StatusDriver {
  metricId: MetricId;
  label: string;
  summary: string;
  percentVsBaseline: number;
  persistenceDays: number;
}

export interface WellnessStatusResult {
  engineVersion: "status-engine@0.1-demo";
  state: WellnessState;
  direction7d: Direction;
  confidence: BaselineConfidence;
  composite: number;
  persistenceDays: number;
  agreeingDomains: number;
  summary: string;
  clinicalDisclaimer: string;
  drivers: StatusDriver[];
  domains: DomainScore[];
  dataQuality: {
    coverageDays: number;
    missingLast7: number;
    sources: DataSourceKind[];
    recencyHours: number | null;
  };
  safety: SafetyDecision;
}

export interface SafetyDecision {
  suppressRecommendations: boolean;
  redirectToCare: boolean;
  reason: string | null;
  severity: "none" | "caution" | "urgent";
}

export interface BehaviorCandidate {
  id: string;
  title: string;
  instruction: string;
  whyShort: string;
  pillar: Exclude<PillarId, "labs">;
  burden: number;
  durationMinutes: number;
  tags: string[];
}

export interface RankedBehavior {
  candidate: BehaviorCandidate;
  score: number;
  relevance: number;
  evidence: number;
  expectedBenefit: number;
  feasibility: number;
  confidence: number;
  preference: number;
  penalty: number;
  why: string;
  evidenceNote: string;
}

export interface AssociationResult {
  behaviorId: string;
  direction: AssociationDirection;
  confidence: number;
  sampleSize: number;
  metric: MetricId;
  summary: string;
  withBehavior: number;
  withoutBehavior: number;
}

export interface LabResult {
  analyte: string;
  value: number;
  unit: string;
  generalLow: number | null;
  generalHigh: number | null;
  flag: "in_interval" | "below" | "above" | "unspecified";
  priorValue: number | null;
  priorDate: string | null;
  note: string;
}

export interface LabReport {
  id: string;
  collectedAt: string;
  reportedAt: string;
  labName: string;
  filename: string;
  parser: string;
  parseConfidence: number;
  panel: string;
  results: LabResult[];
}

export interface ConnectedSource {
  kind: DataSourceKind;
  label: string;
  connected: boolean;
  lastSync: string | null;
  coverage30d: number | null;
  permissions: string[];
  simulated: true;
}

export interface StartingBaselines {
  sleep: string;
  activity: string;
  nutrition: string;
  recovery: string;
}

export const EMPTY_STARTING_BASELINES: StartingBaselines = {
  sleep: "",
  activity: "",
  nutrition: "",
  recovery: "",
};

export type TrackerSource = "manual" | "companion";

export interface ScoringGoals {
  mealTarget: number | null;
  calorieGoal: number | null;
  sleepHoursGoal: number | null;
  activityKind: "steps" | "active_minutes" | null;
  activityGoal: number | null;
  sources: {
    hydration: TrackerSource | null;
    sleep: TrackerSource | null;
    activity: TrackerSource | null;
  };
}

export const EMPTY_SCORING_GOALS: ScoringGoals = {
  mealTarget: null,
  calorieGoal: null,
  sleepHoursGoal: null,
  activityKind: null,
  activityGoal: null,
  sources: { hydration: null, sleep: null, activity: null },
};

export interface Profile {
  displayName: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goals: string[];
  dietaryPreferences: string[];
  restrictions: string[];
  allergies: string[];
  medications: string;
  typicalBedtime: string;
  typicalWake: string;
  typicalDinner: string;
  workPattern: string;
  stressContext: string;
  coachingTone: "direct" | "gentle";
  notifications: boolean;
  timezone: string;
}

export interface ConsentChoices {
  wearables: boolean;
  labs: boolean;
  coaching: boolean;
  productAnalytics: boolean;
}

export interface AdherenceEvent {
  id: string;
  date: string;
  behaviorId: string;
  kind: "accepted" | "completed" | "declined" | "snoozed" | "replaced" | "missed";
  note?: string;
  reason?: string;
}

export interface TodayCommitment {
  date: string;
  behaviorId: string;
  decision: CommitmentDecision;
  replacedWithId?: string;
  reason?: string;
  completedAt?: string;
}

export interface WeeklyReflection {
  weekOf: string;
  energy: number;
  stress: number;
  note: string;
  savedAt: string;
}

export interface CoachMessage {
  id: string;
  role: CoachRole;
  content: string;
  createdAt: string;
  sources?: string[];
  safetyFlag?: boolean;
  feedback?: "useful" | "not_useful";
}

export interface ContextFlags {
  travel: boolean;
  illness: boolean;
  unusualSchedule: boolean;
  menstrualNoted: boolean;
}

export interface WearablePatch {
  sleepHours: number | null;
  sleepEfficiency: number | null;
  bedtimeMinutes: number | null;
  rhr: number | null;
  hrv: number | null;
  steps: number | null;
  activeMinutes: number | null;
  eveningWalkMinutes: number | null;
}

export interface WatchImportRecord {
  id: string;
  date: string;
  importedAt: string;
  generation: number;
  patch: WearablePatch;
}

export interface SyncHistoryItem {
  id: string;
  startedAt: string;
  finishedAt: string;
  status: SyncAttemptStatus;
  message: string;
  recordsWritten: number;
  recordsUpdated: number;
}

export interface WatchNotice {
  kind: "success" | "info" | "error";
  message: string;
}

export interface WatchState {
  connected: boolean;
  status: WatchLinkStatus;
  lastSyncAt: string | null;
  batteryPct: number;
  failNextSync: boolean;
  notice: WatchNotice | null;
}

export interface DemoState {
  version: 2;
  mode: DemoMode;
  onboardingComplete: boolean;
  onboardingStep: number;
  profile: Profile;
  startingBaselines: StartingBaselines;
  scoringGoals: ScoringGoals;
  consents: ConsentChoices;
  sources: ConnectedSource[];
  labReports: LabReport[];
  context: ContextFlags;
  todayEnergy: number | null;
  todayStress: number | null;
  todayCommitment: TodayCommitment | null;
  adherence: AdherenceEvent[];
  snoozedBehaviorIds: string[];
  declinedBehaviorIds: string[];
  coachMessages: CoachMessage[];
  reflection: WeeklyReflection | null;
  enteredAt: string | null;
  watch: WatchState;
  watchImports: WatchImportRecord[];
  syncHistory: SyncHistoryItem[];
  persistedObservations: DailyObservation[];
  dataAsOf: string;
  nowIso: string;
  devices: LinkedDevice[];
}

export interface LinkedDevice {
  id: string;
  name: string;
  platform: string;
  status: "active" | "revoked";
  lastSyncAt: string | null;
  categories: string[];
  createdAt: string;
}

export interface TrendItem {
  metricId: MetricId;
  pillar: PillarId;
  label: string;
  summary: string;
  percentVsBaseline: number;
  robustZ: number;
  persistenceDays: number;
  confidence: number;
  worseForWellness: boolean;
}

export type ReferenceLayer = "mine" | "peer" | "general";
