import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Client } from '@stomp/stompjs';
import type { ChatEvent } from '../api/types';

type Listener = (event: ChatEvent) => void;

interface RealtimeContextValue {
  connected: boolean;
  /** Incrementa a cada (re)conexão; usado para recarregar dados que podem ter chegado offline. */
  connectionCount: number;
  subscribe: (listener: Listener) => () => void;
  sendTyping: (conversationId: number) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function brokerUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
}

/**
 * Mantém uma conexão STOMP/WebSocket autenticada e distribui os eventos da fila
 * privada do usuário ({@code /user/queue/events}) para os componentes interessados.
 */
export function RealtimeProvider({ token, children }: { token: string; children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const listeners = useRef(new Set<Listener>());
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const client = new Client({
      brokerURL: brokerUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
      onConnect: () => {
        client.subscribe('/user/queue/events', (frame) => {
          const event = JSON.parse(frame.body) as ChatEvent;
          listeners.current.forEach((listener) => listener(event));
        });
        setConnected(true);
        setConnectionCount((count) => count + 1);
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;
    return () => {
      clientRef.current = null;
      void client.deactivate();
    };
  }, [token]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const sendTyping = useCallback((conversationId: number) => {
    const client = clientRef.current;
    if (client?.connected) {
      client.publish({ destination: `/app/conversations/${conversationId}/typing`, body: '' });
    }
  }, []);

  const value = useMemo(
    () => ({ connected, connectionCount, subscribe, sendTyping }),
    [connected, connectionCount, subscribe, sendTyping],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime deve ser usado dentro de RealtimeProvider');
  return context;
}

/** Assina os eventos em tempo real enquanto o componente estiver montado. */
export function useChatEvents(listener: Listener) {
  const { subscribe } = useRealtime();
  const latest = useRef(listener);
  latest.current = listener;
  useEffect(() => subscribe((event) => latest.current(event)), [subscribe]);
}
