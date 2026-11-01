-- Public read-only projection for the FieldClimate web app only.
-- The views intentionally run with their owner (postgres) so anon can read
-- this narrow column allowlist without receiving privileges on base tables.
-- Never add raw_data or metadata to these public projections.
create or replace view public.fieldclimate_public_stations
with (security_invoker = false) as
select station_id, station_name, latitude, longitude, altitude_m, first_seen_at, last_synced_at
from public.fieldclimate_stations;

create or replace view public.fieldclimate_public_readings
with (security_invoker = false) as
select station_id, station_name, recorded_at, latitude, longitude, altitude_m, group_name, measurements, fetched_at
from public.fieldclimate;

-- Keep the storage tables inaccessible to public API roles.
revoke all privileges on table public.fieldclimate, public.fieldclimate_stations from anon, authenticated;

-- Expose only the two allowlisted read-only projections.
revoke all privileges on table public.fieldclimate_public_stations, public.fieldclimate_public_readings from anon, authenticated;
grant select on table public.fieldclimate_public_stations, public.fieldclimate_public_readings to anon, authenticated;
