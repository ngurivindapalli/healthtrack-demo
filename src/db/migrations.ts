export type Migration = {
  version: string;
  statements: string[];
  /** Existing databases may already have these columns from an earlier startup. */
  ignoreDuplicateColumn?: boolean;
};

const BASELINE = `
CREATE TABLE IF NOT EXISTS user (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  emailVerified integer NOT NULL,
  image text,
  createdAt integer NOT NULL,
  updatedAt integer NOT NULL
);
CREATE TABLE IF NOT EXISTS session (
  id text PRIMARY KEY,
  expiresAt integer NOT NULL,
  token text NOT NULL UNIQUE,
  createdAt integer NOT NULL,
  updatedAt integer NOT NULL,
  ipAddress text,
  userAgent text,
  userId text NOT NULL REFERENCES user(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS account (
  id text PRIMARY KEY,
  accountId text NOT NULL,
  providerId text NOT NULL,
  userId text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accessToken text,
  refreshToken text,
  idToken text,
  accessTokenExpiresAt integer,
  refreshTokenExpiresAt integer,
  scope text,
  password text,
  createdAt integer NOT NULL,
  updatedAt integer NOT NULL
);
CREATE TABLE IF NOT EXISTS verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expiresAt integer NOT NULL,
  createdAt integer,
  updatedAt integer
);
CREATE TABLE IF NOT EXISTS member_profile (
  user_id text PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  age integer NOT NULL DEFAULT 35,
  sex text NOT NULL DEFAULT 'prefer_not_to_say',
  height_cm integer NOT NULL DEFAULT 170,
  weight_kg integer NOT NULL DEFAULT 70,
  goals_json text NOT NULL DEFAULT '[]',
  dietary_json text NOT NULL DEFAULT '[]',
  restrictions_json text NOT NULL DEFAULT '[]',
  allergies_json text NOT NULL DEFAULT '[]',
  medications text NOT NULL DEFAULT '',
  typical_bedtime text NOT NULL DEFAULT '22:30',
  typical_wake text NOT NULL DEFAULT '06:30',
  typical_dinner text NOT NULL DEFAULT '19:30',
  work_pattern text NOT NULL DEFAULT '',
  stress_context text NOT NULL DEFAULT '',
  coaching_tone text NOT NULL DEFAULT 'gentle',
  notifications integer NOT NULL DEFAULT 1,
  timezone text NOT NULL DEFAULT 'UTC',
  onboarding_complete integer NOT NULL DEFAULT 0,
  onboarding_step integer NOT NULL DEFAULT 0,
  consents_json text NOT NULL DEFAULT '{}',
  workspace_json text NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS linked_device (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL,
  installation_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  categories_json text NOT NULL,
  status text NOT NULL,
  created_at text NOT NULL,
  last_sync_at text,
  revoked_at text
);
CREATE INDEX IF NOT EXISTS linked_device_user ON linked_device(user_id);
CREATE TABLE IF NOT EXISTS pairing_session (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  expires_at text NOT NULL,
  used_at text,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS pairing_user ON pairing_session(user_id);
CREATE TABLE IF NOT EXISTS measurement (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  source_record_id text NOT NULL,
  metric text NOT NULL,
  value real NOT NULL,
  unit text NOT NULL,
  start_time text NOT NULL,
  end_time text,
  timezone text NOT NULL,
  ingested_at text NOT NULL,
  UNIQUE(device_id, source_record_id)
);
CREATE INDEX IF NOT EXISTS measurement_user_time ON measurement(user_id, start_time);
CREATE TABLE IF NOT EXISTS sync_batch (
  id text PRIMARY KEY,
  device_id text NOT NULL,
  user_id text NOT NULL,
  idempotency_key text,
  status text NOT NULL,
  accepted integer NOT NULL,
  duplicates integer NOT NULL,
  rejected integer NOT NULL,
  rejections_json text NOT NULL,
  created_at text NOT NULL,
  UNIQUE(device_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS meal_log (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  logged_on text NOT NULL,
  name text NOT NULL,
  notes text NOT NULL DEFAULT '',
  calories real,
  protein_g real,
  carbs_g real,
  fat_g real,
  source text NOT NULL DEFAULT 'manual',
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS meal_log_user_day ON meal_log(user_id, logged_on);
CREATE TABLE IF NOT EXISTS hydration_log (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  logged_on text NOT NULL,
  milliliters integer NOT NULL,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS hydration_log_user_day ON hydration_log(user_id, logged_on);
CREATE TABLE IF NOT EXISTS hydration_target (
  user_id text PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  milliliters integer NOT NULL
);
CREATE TABLE IF NOT EXISTS sleep_log (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  duration_hours real NOT NULL,
  notes text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS sleep_log_user_time ON sleep_log(user_id, start_time);
CREATE TABLE IF NOT EXISTS workout_log (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  started_at text NOT NULL,
  name text NOT NULL,
  minutes integer NOT NULL,
  notes text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS workout_log_user_time ON workout_log(user_id, started_at);
CREATE TABLE IF NOT EXISTS recovery_log (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  logged_on text NOT NULL,
  energy real,
  fatigue real,
  stress real,
  notes text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS recovery_log_user_day ON recovery_log(user_id, logged_on);
CREATE TABLE IF NOT EXISTS cycle_consent (
  user_id text PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  enabled integer NOT NULL DEFAULT 0,
  typical_length_days integer,
  variability text NOT NULL DEFAULT '',
  life_context text NOT NULL DEFAULT '',
  updated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS cycle_entry (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  logged_on text NOT NULL,
  kind text NOT NULL,
  flow text,
  symptoms_json text NOT NULL DEFAULT '[]',
  notes text NOT NULL DEFAULT '',
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS cycle_entry_user_day ON cycle_entry(user_id, logged_on);
CREATE TABLE IF NOT EXISTS wellness_score (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  score_date text NOT NULL,
  exact_score real NOT NULL,
  display_score integer NOT NULL,
  algorithm_version text NOT NULL,
  provenance_json text NOT NULL,
  calculated_at text NOT NULL,
  UNIQUE(user_id, score_date, algorithm_version)
);
CREATE INDEX IF NOT EXISTS wellness_score_user_day ON wellness_score(user_id, score_date);
`.split(";").map((statement) => statement.trim()).filter(Boolean);

export const MIGRATIONS: Migration[] = [
  { version: "0001_baseline", statements: BASELINE },
  {
    version: "0002_scoring_columns",
    ignoreDuplicateColumn: true,
    statements: [
      "ALTER TABLE recovery_log ADD COLUMN soreness real",
      "ALTER TABLE meal_log ADD COLUMN source_record_id text",
      "ALTER TABLE sleep_log ADD COLUMN source_record_id text",
      "ALTER TABLE workout_log ADD COLUMN source_record_id text",
      "ALTER TABLE hydration_log ADD COLUMN source text NOT NULL DEFAULT 'manual'",
      "ALTER TABLE hydration_log ADD COLUMN source_record_id text",
    ],
  },
  {
    version: "0003_rate_limit",
    statements: [
      `CREATE TABLE IF NOT EXISTS rate_limit_bucket (
        bucket_key text PRIMARY KEY,
        hits integer NOT NULL,
        reset_at integer NOT NULL
      )`,
    ],
  },
];
