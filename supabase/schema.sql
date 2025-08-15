-- Basic schema for TeachTape

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  role text check (role in ('coach','athlete','admin')) not null default 'athlete',
  full_name text,
  avatar_url text,
  bio text,
  sport text,
  created_at timestamptz default now()
);

create unique index if not exists profiles_auth_user_id_idx on profiles(auth_user_id);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null,
  duration_minutes integer not null default 60,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references profiles(id) on delete cascade,
  weekday smallint check (weekday between 0 and 6), -- 0=Sun
  start_time time not null,
  end_time time not null,
  timezone text not null default 'UTC'
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete set null,
  coach_id uuid references profiles(id) on delete set null,
  athlete_id uuid references profiles(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text check (status in ('pending','paid','scheduled','completed','cancelled')) not null default 'pending',
  stripe_payment_intent_id text,
  zoom_meeting_id text,
  zoom_join_url text,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  coach_id uuid references profiles(id) on delete set null,
  athlete_id uuid references profiles(id) on delete set null,
  rating smallint check (rating between 1 and 5) not null,
  comment text,
  created_at timestamptz default now()
);

-- TODO: Add RLS policies per table
