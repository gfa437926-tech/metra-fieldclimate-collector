-- Latest submitted hourly classic report per station only.
-- Prefer coordinates recorded on the report, then the station registry, then researched settlement/airport coordinates.
-- Settlement-level coordinates are approximate; airport coordinates identify the aerodrome reference point.
create or replace view public.classic_public_hourly_latest
with (security_invoker = false)
as
select distinct on (h.station_name)
  h.station_name, h.submission_date, h.utc_time, h.dry_temp, h.wet_temp,
  h.relative_humidity, h.dew_point, h.wind_speed, h.wind_direction,
  h.total_cloud_cover, h.precipitation_amount,
  coalesce(h.station_latitude, s.latitude,
    case
      when h.station_name = 'الإدارة العامة' or h.station_name = 'غير محدد' then null
      when h.station_name = 'الحسكة' then 36.5024
      when h.station_name = 'السويداء' then 32.7090
      when h.station_name = 'القامشلي' then 37.0521
      when h.station_name = 'القرداحة' then 36.0500
      when h.station_name = 'القنيطرة' then 33.1260
      when h.station_name = 'اللاذقية' then 35.7800
      when h.station_name = 'بانياس' then 35.1819
      when h.station_name = 'جرابلس' then 36.8175
      when h.station_name = 'حماه' then 35.1318
      when h.station_name = 'حمص' then 34.7240
      when h.station_name = 'سلمية' then 35.0113
      when h.station_name = 'صافيتا' then 34.8167
      when h.station_name in ('طرطوس','محطة طرطوس') then 34.8890
      when h.station_name = 'حينة' then 33.35187
      when h.station_name ilike '%عمريت%' then 34.8353
      when h.station_name in ('محطة اللاذقية','مطار اللاذقية') then 35.40110
      when h.station_name in ('محطة حلب','مطار حلب الدولي') then 36.18056
      when h.station_name = 'محطة حمص' then 34.7500
      when h.station_name = 'مطار دمشق الدولي' then 33.41140
      else null
    end) as latitude,
  coalesce(h.station_longitude, s.longitude,
    case
      when h.station_name = 'الإدارة العامة' or h.station_name = 'غير محدد' then null
      when h.station_name = 'الحسكة' then 40.7477
      when h.station_name = 'السويداء' then 36.5695
      when h.station_name = 'القامشلي' then 41.2314
      when h.station_name = 'القرداحة' then 35.4500
      when h.station_name = 'القنيطرة' then 35.8246
      when h.station_name = 'اللاذقية' then 35.5200
      when h.station_name = 'بانياس' then 35.9487
      when h.station_name = 'جرابلس' then 38.0111
      when h.station_name = 'حماه' then 36.7578
      when h.station_name = 'حمص' then 36.7256
      when h.station_name = 'سلمية' then 37.0532
      when h.station_name = 'صافيتا' then 36.1333
      when h.station_name in ('طرطوس','محطة طرطوس') then 35.8866
      when h.station_name = 'حينة' then 35.94196
      when h.station_name ilike '%عمريت%' then 35.9042
      when h.station_name in ('محطة اللاذقية','مطار اللاذقية') then 35.94870
      when h.station_name in ('محطة حلب','مطار حلب الدولي') then 37.22417
      when h.station_name = 'محطة حمص' then 36.7170
      when h.station_name = 'مطار دمشق الدولي' then 36.51560
      else null
    end) as longitude,
  h.station_altitude, h.created_at
from public.classic_public_hourly_reports h
left join public.stations s
  on (s.station_name_ar = h.station_name or s.name = h.station_name)
order by h.station_name, h.submission_date desc, h.utc_time desc, h.created_at desc;
revoke all on public.classic_public_hourly_latest from anon, authenticated;
grant select on public.classic_public_hourly_latest to anon, authenticated;
