CREATE TABLE baker_mcp_connection (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 token_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
