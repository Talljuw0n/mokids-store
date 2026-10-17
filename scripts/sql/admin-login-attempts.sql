-- Persistent admin login rate-limit state (used by app/api/admin/login/route.ts).
-- Without this table the login route falls back to per-instance memory,
-- which resets on every serverless cold start.
create table if not exists admin_login_attempts (
  ip text primary key,
  count integer not null default 0,
  round integer not null default 0,
  reset_at timestamptz not null default now(),
  locked_out boolean not null default false
);

-- Only the server (service role) touches this table
alter table admin_login_attempts enable row level security;
