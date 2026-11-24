CREATE TABLE users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text,
  google_subject text UNIQUE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff')),
  CHECK (password_hash IS NOT NULL OR google_subject IS NOT NULL)
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE labs (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  location text NOT NULL
);
