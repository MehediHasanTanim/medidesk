# SSE Hook Pattern

## Reference: `useQueueSSE`
File: `frontend/src/features/appointments/hooks/useQueueSSE.ts`

## Design
```typescript
type SSEStatus = "connecting" | "live" | "polling" | "error";

function useQueueSSE(date: string, chamberId?: string) {
  const [sseStatus, setSseStatus] = useState<SSEStatus>("connecting");
  const [data, setData] = useState<QueueResponse | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const url = `/api/v1/appointments/queue/stream/?token=${token}&date=${date}`;
    const es = new EventSource(url);

    es.onopen = () => setSseStatus("live");
    es.onmessage = (e) => setData(JSON.parse(e.data));
    es.onerror = () => {
      setSseStatus("error");
      es.close();
      // React Query refetchInterval takes over as polling fallback
    };
    return () => es.close();
  }, [date, chamberId]);

  return { data, sseStatus };
}
```

## Status states
- `"connecting"` — EventSource opened, waiting for first message
- `"live"` — receiving SSE events
- `"polling"` — SSE closed, React Query interval polling active
- `"error"` — SSE failed, fallback polling active

## UI indicator (QueuePage)
- `"live"` → green pulse badge "Live"
- `"connecting"` → "Connecting…"
- `"polling"` / `"error"` → "↻ Polling"

## Token refresh note
SSE uses the access token at connection time. If token expires mid-stream, server closes connection → hook falls back to polling → normal React Query refresh picks up new token on next API call.
