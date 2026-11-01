-- Latest submitted hourly classic report per station only.
-- Coordinates for Amrit and Hinah are approximate settlement-level map pins.
create or replace view public.classic_public_hourly_latest
with (security_invoker = false)
as
select distinct on (h.station_name)
  h.station_name, h.submission_date, h.utc_time, h.dry_temp, h.wet_temp,
  h.relative_humidity, h.dew_point, h.wind_speed, h.wind_direction,
  h.total_cloud_cover, h.precipitation_amount,
  coalesce(h.station_latitude,
    case when h.station_name ilike '%عمريت%' then 34.8353
         when h.station_name = 'حينة' then 33.35187
         when h.station_name in ('طرطوس','محطة طرطوس') then 34.8890 end) as latitude,
  coalesce(h.station_longitude,
    case when h.station_name ilike '%عمريت%' then 35.9075
         when h.station_name = 'حينة' then 35.94196
         when h.station_name in ('طرطوس','محطة طرطوس') then 35.8866 end) as longitude,
  h.station_altitude, h.created_at
from public.classic_public_hourly_reports h
order by h.station_name, h.submission_date desc, h.utc_time desc, h.created_at desc;
revoke all on public.classic_public_hourly_latest from anon, authenticated;
grant select on public.classic_public_hourly_latest to anon, authenticated;
