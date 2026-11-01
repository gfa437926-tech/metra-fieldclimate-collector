import asyncio, logging, time
from datetime import datetime, timezone, timedelta
from typing import Any
from supabase import create_client
from . import config
from .fieldclimate import FieldClimateClient
logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(message)s'); log=logging.getLogger('fieldclimate-sync')
db=create_client(config.SUPABASE_URL,config.SUPABASE_SERVICE_ROLE_KEY)
def as_list(payload:Any)->list:
    if payload is None:return []
    if isinstance(payload,list):return payload
    if isinstance(payload,dict):
        for key in ('data','items','stations','result'):
            if isinstance(payload.get(key),list):return payload[key]
        return [payload]
    return []
def first_value(obj,names):
    for name in names:
        value=obj.get(name)
        if value not in (None,''):return value
    return None
def station_id_of(item):return str(first_value(item,('name','station_id','stationId','id','device_id','deviceId')) or '')
def station_payload(item):
    coords=item.get('coordinates') or item.get('location') or {}; coords=coords if isinstance(coords,dict) else {}
    return {'station_id':station_id_of(item),'station_name':first_value(item,('custom_name','station_name','name','description')),'latitude':first_value(coords,('latitude','lat')) or first_value(item,('latitude','lat')),'longitude':first_value(coords,('longitude','lon','lng')) or first_value(item,('longitude','lon','lng')),'altitude_m':first_value(coords,('altitude','altitude_m')) or first_value(item,('altitude','altitude_m')),'metadata':item,'last_synced_at':datetime.now(timezone.utc).isoformat()}
def find_timestamp(obj:Any):
    if isinstance(obj,dict):
        for key in ('recorded_at','timestamp','date','time','datetime','dt'):
            value=obj.get(key)
            if isinstance(value,(int,float)):
                seconds=value/1000 if value>10_000_000_000 else value
                return datetime.fromtimestamp(seconds,tz=timezone.utc).isoformat()
            if isinstance(value,str):
                try:
                    parsed=datetime.fromisoformat(value.replace('Z','+00:00'))
                    if parsed.tzinfo is None:parsed=parsed.replace(tzinfo=timezone.utc)
                    return parsed.astimezone(timezone.utc).isoformat()
                except ValueError:pass
        for value in obj.values():
            found=find_timestamp(value)
            if found:return found
    elif isinstance(obj,list):
        for value in obj:
            found=find_timestamp(value)
            if found:return found
    return None
def extract_records(payload):
    records=[]
    for item in as_list(payload):
        if isinstance(item,dict):
            stamp=find_timestamp(item)
            if stamp:records.append({'recorded_at':stamp,'measurements':item})
    return records
async def sync_once():
    api=FieldClimateClient(); stations_raw=await api.get('/user/stations')
    stations=[station_payload(x) for x in as_list(stations_raw) if isinstance(x,dict)]; stations=[x for x in stations if x['station_id']]
    if stations:db.table('fieldclimate_stations').upsert(stations,on_conflict='station_id').execute()
    log.info('Stations discovered: %s',len(stations)); end=int(time.time()); start=int((datetime.now(timezone.utc)-timedelta(days=config.LOOKBACK_DAYS)).timestamp())
    for station in stations:
        sid=station['station_id']
        for group in config.GROUPS:
            try:
                payload=await api.get(f'/data/{sid}/{group}/from/{start}/to/{end}'); records=extract_records(payload)
                rows=[{'station_id':sid,'station_name':station['station_name'],'recorded_at':item['recorded_at'],'group_name':group,'latitude':station['latitude'],'longitude':station['longitude'],'altitude_m':station['altitude_m'],'measurements':{'group':group,'values':item['measurements']},'raw_data':item['measurements'],'fetched_at':datetime.now(timezone.utc).isoformat()} for item in records]
                for offset in range(0,len(rows),500):db.table('fieldclimate').upsert(rows[offset:offset+500],on_conflict='station_id,recorded_at,group_name').execute()
                log.info('%s %s: %s records',sid,group,len(rows))
            except Exception:log.exception('Sync failed station=%s group=%s',sid,group)
async def main():
    while True:
        await sync_once(); await asyncio.sleep(config.INTERVAL_SECONDS)
if __name__=='__main__':asyncio.run(main())
