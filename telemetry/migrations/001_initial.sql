CREATE TABLE IF NOT EXISTS anonymous_users (
  user_id uuid PRIMARY KEY,
  first_seen timestamptz NOT NULL,
  last_seen timestamptz NOT NULL
);

DO $$ BEGIN
  CREATE TYPE telemetry_mode AS ENUM ('visual', 'classic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE telemetry_step_type AS ENUM ('command', 'undo', 'edit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS proof_attempts (
  attempt_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES anonymous_users(user_id),
  source_attempt_id uuid,
  game_id text NOT NULL,
  world_id text NOT NULL,
  level_id integer NOT NULL,
  mode telemetry_mode NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  duration_ms integer,
  completed boolean NOT NULL DEFAULT false,
  initial_script text,
  play_script text,
  lean_script text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS proof_steps (
  event_id uuid PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES proof_attempts(attempt_id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  client_ts timestamptz NOT NULL,
  elapsed_ms integer NOT NULL,
  step_type telemetry_step_type NOT NULL,
  command text NOT NULL,
  from_line integer,
  removed_lines integer,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (attempt_id, sequence)
);

CREATE INDEX IF NOT EXISTS proof_attempts_level_idx
  ON proof_attempts (game_id, world_id, level_id, mode, started_at);
CREATE INDEX IF NOT EXISTS proof_attempts_user_idx
  ON proof_attempts (user_id, started_at);
