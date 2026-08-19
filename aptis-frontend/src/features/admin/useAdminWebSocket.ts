import { useEffect, useRef, useState, useCallback } from 'react';
import { tokenStorage } from '@/lib/tokenStorage';

export interface AdminWsEvent<T = Record<string, unknown>> {
  type: 'CONNECTED' | 'PONG' | 'BANK_TRANSFER_CLAIMED' | 'BANK_TRANSFER_CONFIRMED' | 'BANK_TRANSFER_REJECTED' | string;
  timestamp: string;
  payload?: T;
  message?: string;
}

export type WsConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

interface UseAdminWebSocketOptions {
  enabled?: boolean;
  onEvent?: (event: AdminWsEvent) => void;
}

export function useAdminWebSocket(options: UseAdminWebSocketOptions = {}) {
  const { enabled = true, onEvent } = options;
  const [status, setStatus] = useState<WsConnectionStatus>('DISCONNECTED');
  const [lastEvent, setLastEvent] = useState<AdminWsEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = tokenStorage.getAccessToken();
    if (!token) {
      setStatus('DISCONNECTED');
      return;
    }

    // Đóng kết nối cũ nếu có
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // bỏ qua
      }
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/admin/bank-transfers?token=${encodeURIComponent(token)}`;

    setStatus('CONNECTING');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('CONNECTED');
        reconnectAttemptsRef.current = 0;

        // Thiết lập heartbeat ping mỗi 25 giây để giữ kết nối
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send('ping');
            } catch {
              // Bỏ qua lỗi gửi ping
            }
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed: AdminWsEvent = JSON.parse(event.data);
          setLastEvent(parsed);
          onEventRef.current?.(parsed);
        } catch {
          // Bỏ qua tin nhắn không phải JSON
        }
      };

      ws.onerror = () => {
        // ws.onclose sẽ kích hoạt và xử lý kết nối lại
      };

      ws.onclose = () => {
        setStatus('DISCONNECTED');
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Tự động kết nối lại với backoff (2s, 4s, 8s, tối đa 15s)
        if (enabled) {
          const delay = Math.min(15000, 2000 * Math.pow(1.5, reconnectAttemptsRef.current));
          reconnectAttemptsRef.current += 1;

          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch {
      setStatus('DISCONNECTED');
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('DISCONNECTED');
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  return {
    status,
    lastEvent,
    reconnect: connect,
  };
}
