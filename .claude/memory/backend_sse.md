# SSE / Streaming Pattern

## Implementation (Queue as reference)
Files:
- `backend/interfaces/api/v1/appointments/sse_auth.py` — `QueryParamJWTAuthentication`
- `backend/interfaces/api/v1/appointments/views.py` — `QueueSSEView`

## Why `QueryParamJWTAuthentication`
`EventSource` API in browsers cannot set custom headers. JWT must be passed as `?token=<access_token>` query param. Custom auth class reads from `request.GET.get("token")` instead of `Authorization` header.

## `StreamingHttpResponse` generator pattern
```python
def event_stream():
    last_hash = None
    deadline = time.time() + 600   # auto-close after 10 min
    while time.time() < deadline:
        close_old_connections()
        data = _build_queue_items(...)
        current_hash = hashlib.md5(json.dumps(data).encode()).hexdigest()
        if current_hash != last_hash:
            last_hash = current_hash
            yield f"data: {json.dumps(data)}\n\n"
        else:
            yield ": heartbeat\n\n"   # SSE comment keeps connection alive
        time.sleep(3)

return StreamingHttpResponse(event_stream(), content_type="text/event-stream")
```

Key settings on the response:
```python
response["Cache-Control"] = "no-cache"
response["X-Accel-Buffering"] = "no"   # disable nginx buffering
```

## Frontend hook design (`useQueueSSE`)
File: `frontend/src/features/appointments/hooks/useQueueSSE.ts`

- `sseStatus`: `"connecting" | "live" | "polling" | "error"`
- Opens `EventSource` with `?token=<localStorage access_token>`
- On `onerror`: sets status → `"error"`, closes EventSource, falls back to 10s polling via React Query `refetchInterval`
- On reconnect (new EventSource): resets to `"connecting"`

## Gunicorn note
Each SSE connection holds one WSGI worker for the duration. Fine for ≤10 simultaneous viewers. For more, consider `--worker-class geventlet` or switch to async server.

## URL
`GET /api/v1/appointments/queue/stream/?token=<jwt>&date=<YYYY-MM-DD>&chamber_id=<uuid>`
