# Unified stations API contract

`GET /api/v1/stations?source=all|classic|fieldclimate&search=...`

Example: `{"items":[{"id":"station-id","name":"Station name","source":"fieldclimate","latitude":0,"longitude":0,"lastObservedAt":"2026-01-01T10:00:00Z"}]}`

- `classic`: read existing METRA `stations` without changing ingestion.
- `fieldclimate`: read `fieldclimate_stations`.
- `all`: combine both sources and label each station.
- Enforce user authorization server-side; never expose service-role or OAuth secrets in Flutter.
- Documentation only: this unified backend endpoint is not implemented yet.
