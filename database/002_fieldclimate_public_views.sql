-- Public read-only projection for the FieldClimate web app only.
-- Base tables remain protected by RLS and are not granted to anon.
create or replace view public.fieldclimate_public_stations as
select station_id, station_name, latitude, longitude, altitude_m, first_seen_at, last_synced_at
from public.fieldclimate_stations;

create or replace view public.fieldclimate_public_readings as
select station_id, station_name, recorded_at, latitude, longitude, altitude_m, group_name, measurements, fetched_at
from public.fieldclimate;

grant select on public.fieldclimate_public_stations to anon, authenticated;
grant select on public.fieldclimate_public_readings to anon, authenticated;
