create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz not null default now(),
  source     text not null default 'landing'
);

alter table public.waitlist enable row level security;

create policy "public_insert_waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);
