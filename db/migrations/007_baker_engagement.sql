CREATE TABLE baker_recipe_likes (
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 recipe_id text NOT NULL REFERENCES baker_recipes(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id, recipe_id)
);

CREATE TABLE baker_bake_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recipe_id text NOT NULL REFERENCES baker_recipes(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 body text NOT NULL,
 image text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(recipe_id, user_id)
);
CREATE INDEX baker_bake_reviews_recipe ON baker_bake_reviews(recipe_id, created_at DESC);

CREATE TABLE baker_follows (
 follower_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(follower_id, author_id),
 CHECK (follower_id <> author_id)
);

CREATE TABLE baker_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('new_recipe')),
 recipe_id text REFERENCES baker_recipes(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz
);
CREATE INDEX baker_notifications_user ON baker_notifications(user_id, created_at DESC);

CREATE TABLE baker_shopping_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 recipe_id text REFERENCES baker_recipes(id) ON DELETE SET NULL,
 name text NOT NULL,
 amount numeric NOT NULL CHECK(amount > 0),
 unit text NOT NULL,
 checked boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX baker_shopping_items_user ON baker_shopping_items(user_id, created_at);
