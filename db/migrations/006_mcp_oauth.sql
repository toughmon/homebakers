CREATE TABLE baker_oauth_clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 redirect_uris jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE baker_oauth_pending (
 id text PRIMARY KEY,
 client_id uuid NOT NULL REFERENCES baker_oauth_clients(id) ON DELETE CASCADE,
 redirect_uri text NOT NULL,
 code_challenge text NOT NULL,
 state text,
 resource text NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE TABLE baker_oauth_codes (
 code_hash text PRIMARY KEY,
 client_id uuid NOT NULL REFERENCES baker_oauth_clients(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 redirect_uri text NOT NULL,
 code_challenge text NOT NULL,
 resource text NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE TABLE baker_oauth_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES baker_oauth_clients(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 access_hash text NOT NULL UNIQUE,
 refresh_hash text NOT NULL UNIQUE,
 resource text NOT NULL,
 access_expires_at timestamptz NOT NULL,
 refresh_expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX baker_oauth_grants_user ON baker_oauth_grants(user_id);
CREATE INDEX baker_oauth_grants_access ON baker_oauth_grants(access_hash);
