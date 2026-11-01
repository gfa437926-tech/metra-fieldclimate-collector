-- Public allowlisted latest reading per FieldClimate station.
-- Coordinates are sourced from the dedicated station metadata table.
create or replace view public.fieldclimate_public_latest_readings as
select distinct on (r.station_id)
  r.station_id,
  r.station_name,
  r.recorded_at,
  s.latitude,
  s.longitude,
  s.altitude_m,
  r.group_name,
  r.measurements,
  r.fetched_at
from public.fieldclimate r
left join public.fieldclimate_stations s on s.station_id = r.station_id
order by r.station_id, r.recorded_at desc, r.fetched_at desc;

alter view public.fieldclimate_public_latest_readings set (security_invoker = false);
revoke all privileges on table public.fieldclimate_public_latest_readings from anon, authenticated;
grant select on table public.fieldclimate_public_latest_readings to anon, authenticated;
