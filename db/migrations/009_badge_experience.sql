CREATE TABLE baker_badge_awards (
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 badge_id text NOT NULL,
 earned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,badge_id)
);
ALTER TABLE baker_users ADD COLUMN featured_badge text;
ALTER TABLE baker_notifications DROP CONSTRAINT baker_notifications_kind_check;
ALTER TABLE baker_notifications ADD CONSTRAINT baker_notifications_kind_check CHECK(kind IN ('new_recipe','badge_earned'));
ALTER TABLE baker_notifications ADD COLUMN badge_id text;
ALTER TABLE baker_notifications ADD COLUMN badge_name text;
