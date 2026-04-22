-- Run this in your Supabase SQL Editor (supabase.com → project → SQL Editor)

-- ============================================================
-- 1. ROOMS TABLE
-- ============================================================
create table if not exists public.rooms (
  id           uuid default gen_random_uuid() primary key,
  room_id      text unique not null,
  password     text not null,
  capacity     int  default 2,
  member_count int  default 0,
  created_at   timestamptz default now()
);

-- ============================================================
-- 2. Row Level Security (allow all for anon — fine for a demo)
-- ============================================================
alter table public.rooms enable row level security;

create policy "allow_all_rooms" on public.rooms
  for all using (true) with check (true);

-- ============================================================
-- 3. Helper functions for atomic member count updates
-- ============================================================
create or replace function increment_member_count(p_room_id text)
returns void language sql as $$
  update public.rooms
  set member_count = member_count + 1
  where room_id = p_room_id;
$$;

create or replace function decrement_member_count(p_room_id text)
returns void language sql as $$
  update public.rooms
  set member_count = greatest(0, member_count - 1)
  where room_id = p_room_id;
$$;

-- ============================================================
-- 4. Enable Realtime on rooms table
--    (also enable in Dashboard → Database → Replication)
-- ============================================================
alter publication supabase_realtime add table public.rooms;

-- ============================================================
-- Done! No messages table needed — messages are broadcast only
-- via Supabase Realtime channels and never stored on the server.
-- This preserves end-to-end encryption: only ciphertext flies
-- over the wire and nothing is persisted.
-- ============================================================
