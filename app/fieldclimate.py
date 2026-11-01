import httpx
from . import config
class FieldClimateClient:
    def __init__(self): self._token=None
    async def _access_token(self):
        if self._token: return self._token
        async with httpx.AsyncClient(timeout=30) as client:
            response=await client.post(config.TOKEN_URL,data={'grant_type':'client_credentials'},auth=(config.FIELDCLIMATE_CLIENT_ID,config.FIELDCLIMATE_CLIENT_SECRET),headers={'Accept':'application/json'})
            response.raise_for_status(); payload=response.json(); token=payload.get('access_token')
            if not token: raise RuntimeError('OAuth response did not include access_token')
            self._token=token; return token
    async def get(self,path):
        token=await self._access_token()
        async with httpx.AsyncClient(base_url=config.API_BASE,timeout=60,headers={'Authorization':f'Bearer {token}','Accept':'application/json'}) as client:
            response=await client.get(path)
            if response.status_code==401:
                self._token=None; token=await self._access_token(); response=await client.get(path,headers={'Authorization':f'Bearer {token}'})
            response.raise_for_status()
            return None if response.status_code==204 else response.json()
