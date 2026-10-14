import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../api';
import type { Conversation } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { useChatEvents, useRealtime } from '../realtime/RealtimeContext';
import { playNotificationSound, showBrowserNotification } from '../utils/alerts';

interface ConversationsContextValue {
  conversations: Conversation[];
  loading: boolean;
  totalUnread: number;
  reload: () => Promise<void>;
  markReadLocally: (conversationId: number) => void;
  setActiveConversation: (conversationId: number | null) => void;
  chatPath: (conversationId: number) => string;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

/**
 * Lista de conversas do usuário, mantida em dia pelos eventos do WebSocket.
 * Também dispara os alertas (som, toast e notificação do navegador) — o servidor só marca
 * {@code alert=true} para o médico quando a mensagem chega dentro do horário configurado.
 */
export function ConversationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { connectionCount } = useRealtime();
  const toast = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const conversationsRef = useRef<Conversation[]>([]);
  const activeId = useRef<number | null>(null);

  conversationsRef.current = conversations;

  const chatPath = useCallback(
    (id: number) => (user?.role === 'DOCTOR' ? `/medico/conversas/${id}` : `/paciente/conversas/${id}`),
    [user?.role],
  );

  const reload = useCallback(async () => {
    try {
      setConversations(await chatApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, connectionCount]);

  useChatEvents((event) => {
    if (event.type === 'CONVERSATION_UPDATED') {
      void reload();
      return;
    }
    if (event.type === 'MESSAGES_READ') {
      // Atualiza os "vistos" da última mensagem exibida na lista.
      setConversations((list) =>
        list.map((c) =>
          c.id === event.conversationId && c.lastMessage && c.lastMessage.senderId === user?.id && !c.lastMessage.readAt
            ? { ...c, lastMessage: { ...c.lastMessage, readAt: event.data.readAt } }
            : c,
        ),
      );
      return;
    }
    if (event.type !== 'MESSAGE_CREATED' || !user) return;

    const message = event.data;
    const current = conversationsRef.current.find((c) => c.id === event.conversationId);
    if (!current) {
      void reload();
      return;
    }
    const isMine = message.senderId === user.id;
    const viewing = activeId.current === event.conversationId && document.visibilityState === 'visible';
    const countsAsUnread = !isMine && !viewing && message.senderId !== null;

    setConversations((list) => {
      const target = list.find((c) => c.id === event.conversationId);
      if (!target || (target.lastMessage && target.lastMessage.id >= message.id)) return list;
      const updated = { ...target, lastMessage: message, unreadCount: target.unreadCount + (countsAsUnread ? 1 : 0) };
      return [updated, ...list.filter((c) => c.id !== event.conversationId)];
    });

    if (event.alert && !isMine && !viewing) {
      const from = message.senderName ?? current.counterpart.name;
      const preview = message.content.length > 90 ? `${message.content.slice(0, 90)}…` : message.content;
      const open = () => navigate(chatPath(event.conversationId));
      playNotificationSound();
      toast({ title: from, description: preview, tone: 'message', onClick: open });
      if (document.visibilityState !== 'visible') showBrowserNotification(from, preview, open);
    }
  });

  const markReadLocally = useCallback((conversationId: number) => {
    setConversations((list) =>
      list.some((c) => c.id === conversationId && c.unreadCount > 0)
        ? list.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        : list,
    );
  }, []);

  const setActiveConversation = useCallback((conversationId: number | null) => {
    activeId.current = conversationId;
  }, []);

  const value = useMemo(
    () => ({
      conversations,
      loading,
      totalUnread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
      reload,
      markReadLocally,
      setActiveConversation,
      chatPath,
    }),
    [conversations, loading, reload, markReadLocally, setActiveConversation, chatPath],
  );

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export function useConversations() {
  const context = useContext(ConversationsContext);
  if (!context) throw new Error('useConversations deve ser usado dentro de ConversationsProvider');
  return context;
}
