CREATE TABLE graph_runs (
  id uuid PRIMARY KEY,
  graph_id uuid NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
  graph_revision integer NOT NULL,
  document jsonb NOT NULL,
  task text NOT NULL CHECK (char_length(task) BETWEEN 1 AND 10000),
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'interrupted')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX graph_runs_graph_created_idx ON graph_runs (graph_id, created_at DESC);

CREATE TABLE graph_run_steps (
  run_id uuid NOT NULL REFERENCES graph_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  sequence integer NOT NULL,
  role text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped', 'interrupted')),
  output text,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  PRIMARY KEY (run_id, node_id)
);
