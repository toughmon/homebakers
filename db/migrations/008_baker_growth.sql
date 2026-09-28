CREATE TABLE baker_journal (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 recipe_id text REFERENCES baker_recipes(id) ON DELETE SET NULL,
 recipe_key text NOT NULL,
 recipe_title text NOT NULL,
 category text NOT NULL,
 baked_on date NOT NULL,
 body text NOT NULL,
 changes text NOT NULL DEFAULT '',
 outcome text NOT NULL CHECK(outcome IN ('성공','아쉬움','다시 도전')),
 image text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX baker_journal_user ON baker_journal(user_id,baked_on DESC);

CREATE TABLE baker_weekly_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 week_start date NOT NULL UNIQUE,
 week_end date NOT NULL,
 category text NOT NULL,
 title text NOT NULL,
 description text NOT NULL
);
CREATE TABLE baker_challenge_entries (
 challenge_id uuid NOT NULL REFERENCES baker_weekly_challenges(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 journal_id uuid REFERENCES baker_journal(id) ON DELETE SET NULL,
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(challenge_id,user_id)
);
CREATE TABLE baker_helpful_votes (
 comment_id uuid NOT NULL REFERENCES baker_comments(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(comment_id,user_id)
);
CREATE TABLE baker_accepted_answers (
 post_id uuid PRIMARY KEY REFERENCES baker_posts(id) ON DELETE CASCADE,
 comment_id uuid NOT NULL UNIQUE REFERENCES baker_comments(id) ON DELETE CASCADE
);
CREATE TABLE baker_xp_ledger (
 user_id uuid NOT NULL REFERENCES baker_users(id) ON DELETE CASCADE,
 event_key text NOT NULL,
 points integer NOT NULL CHECK(points > 0),
 reason text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,event_key)
);
