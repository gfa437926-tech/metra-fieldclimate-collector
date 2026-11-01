-- Applied to INSERT project: vktcvkwqszehgmhqjrkb
-- Keep FieldClimate data separate from classic METRA tables.
create table if not exists public.fieldclimate (id uuid primary key default gen_random_uuid(), station_id text not null, station_name text, recorded_at timestamptz not null, latitude double precision, longitude double precision, altitude_m double precision, measurements jsonb not null default '{}'::jsonb, raw_data jsonb not null default '{}'::jsonb, fetched_at timestamptz not null default now(), created_at timestamptz not null default now(), constraint fieldclimate_station_time_unique unique (station_id, recorded_at));
create index if not exists fieldclimate_station_recorded_at_idx on public.fieldclimate (station_id, recorded_at desc);
alter table public.fieldclimate enable row level security;
revoke all on table public.fieldclimate from public, anon, authenticated;
create table if not exists public.fieldclimate_stations (station_id text primary key, station_name text, latitude double precision, longitude double precision, altitude_m double precision, metadata jsonb not null default '{}'::jsonb, first_seen_at timestamptz not null default now(), last_synced_at timestamptz not null default now());
alter table public.fieldclimate_stations enable row level security;
revoke all on table public.fieldclimate_stations from public, anon, authenticated;
