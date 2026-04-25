import { useEffect, useRef, useState } from "react";
import type { QueueResponse } from "@/features/appointments/api/appointmentsApi";

export type SSEStatus = "connecting" | "live" | "polling" | "error";

/**
 * Subscribe to live queue updates via Server-Sent Events.
 *
 * Falls back to polling (every 10 s) if:
 *   - SSE is not supported by the browser
 *   - The EventSource connection errors out
 *
 * The backend stream closes itself after ~10 minutes; EventSource
 * automatically reconnects, so the hook stays live indefinitely.
 */
export function useQueueSSE(
  date: string,
  chamberId?: string,
  pollFallbackFn?: () => Promise<QueueResponse>,
): { data: QueueResponse | null; sseStatus: SSEStatus; refetch: () => void } {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [sseStatus, setSseStatus] = useState<SSEStatus>("connecting");
  const esRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const manualRefetchRef = useRef(0);  // increment to force a manual refetch

  const [tick, setTick] = useState(0);
  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    // Clean up any previous connections
    esRef.current?.close();
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    if (!token || !("EventSource" in window)) {
      // No SSE support — use polling only
      setSseStatus("polling");
      startPolling();
      return cleanup;
    }

    setSseStatus("connecting");
    const params = new URLSearchParams({ token, date });
    if (chamberId) params.set("chamber_id", chamberId);

    const es = new EventSource(`/api/v1/appointments/queue/stream/?${params}`);
    esRef.current = es;

    es.onopen = () => setSseStatus("live");

    es.onmessage = (e) => {
      try {
        setData(JSON.parse(e.data));
        setSseStatus("live");
      } catch {
        // malformed payload — ignore
      }
    };

    es.addEventListener("reconnect", () => {
      // Backend sent reconnect signal — EventSource will reconnect automatically
    });

    es.onerror = () => {
      // EventSource auto-retries; if it keeps failing, fall back to polling
      setSseStatus("polling");
      es.close();
      startPolling();
    };

    function startPolling() {
      if (!pollFallbackFn) return;
      pollFallbackFn().then(setData).catch(() => setSseStatus("error"));
      pollIntervalRef.current = setInterval(() => {
        pollFallbackFn().then(setData).catch(() => setSseStatus("error"));
      }, 10_000);
    }

    function cleanup() {
      esRef.current?.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, chamberId, tick]);

  return { data, sseStatus, refetch };
}
