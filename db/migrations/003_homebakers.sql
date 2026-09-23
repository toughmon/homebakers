CREATE TABLE baker_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
 name text NOT NULL, password_hash text, google_sub text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE baker_sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX baker_sessions_expiry ON baker_sessions(expires_at);
CREATE TABLE baker_recipes (
 id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES baker_users(id),
 title text NOT NULL, description text NOT NULL, image text NOT NULL,
 category text NOT NULL, difficulty text NOT NULL, minutes integer NOT NULL CHECK(minutes > 0),
 servings integer NOT NULL CHECK(servings > 0), ingredients jsonb NOT NULL, steps jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE baker_bookmarks (
 user_id uuid REFERENCES baker_users(id) ON DELETE CASCADE,
 recipe_id text REFERENCES baker_recipes(id) ON DELETE CASCADE, PRIMARY KEY(user_id, recipe_id)
);
CREATE TABLE baker_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES baker_users(id),
 category text NOT NULL, title text NOT NULL, body text NOT NULL, image text,
 recipe_id text REFERENCES baker_recipes(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE baker_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES baker_users(id),
 recipe_id text REFERENCES baker_recipes(id) ON DELETE CASCADE,
 post_id uuid REFERENCES baker_posts(id) ON DELETE CASCADE, body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((recipe_id IS NOT NULL)::integer + (post_id IS NOT NULL)::integer = 1)
);
CREATE TABLE baker_post_likes (
 user_id uuid REFERENCES baker_users(id) ON DELETE CASCADE,
 post_id uuid REFERENCES baker_posts(id) ON DELETE CASCADE, PRIMARY KEY(user_id, post_id)
);
CREATE INDEX baker_recipes_created ON baker_recipes(created_at DESC);
CREATE INDEX baker_posts_created ON baker_posts(created_at DESC);
CREATE INDEX baker_comments_recipe ON baker_comments(recipe_id);
CREATE INDEX baker_comments_post ON baker_comments(post_id);
