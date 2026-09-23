ALTER TABLE baker_mcp_connection RENAME TO baker_mcp_connection_legacy;

CREATE TABLE baker_mcp_connection (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK (provider IN ('codex', 'claude', 'gemini', 'chatgpt', 'other')),
 token_hash text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 UNIQUE (user_id, provider)
);
CREATE INDEX baker_mcp_connection_expiry ON baker_mcp_connection(expires_at);

INSERT INTO baker_mcp_connection(user_id, provider, token_hash, created_at, expires_at)
SELECT user_id, 'codex', token_hash, created_at, expires_at
FROM baker_mcp_connection_legacy;

DROP TABLE baker_mcp_connection_legacy;
