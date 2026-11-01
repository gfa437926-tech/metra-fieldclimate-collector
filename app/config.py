import os
from dotenv import load_dotenv
load_dotenv()
def required(name: str) -> str:
    value = os.getenv(name, '').strip()
    if not value: raise RuntimeError(f'Missing required environment variable: {name}')
    return value
FIELDCLIMATE_CLIENT_ID=required('FIELDCLIMATE_CLIENT_ID')
FIELDCLIMATE_CLIENT_SECRET=required('FIELDCLIMATE_CLIENT_SECRET')
SUPABASE_URL=required('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY=required('SUPABASE_SERVICE_ROLE_KEY')
TOKEN_URL=os.getenv('FIELDCLIMATE_TOKEN_URL','https://oauth.fieldclimate.com/token')
API_BASE=os.getenv('FIELDCLIMATE_API_BASE','https://api.fieldclimate.com/v2').rstrip('/')
GROUPS=[x.strip() for x in os.getenv('SYNC_GROUPS','hourly,daily').split(',') if x.strip()]
LOOKBACK_DAYS=int(os.getenv('SYNC_LOOKBACK_DAYS','30'))
INTERVAL_SECONDS=int(os.getenv('SYNC_INTERVAL_SECONDS','900'))
