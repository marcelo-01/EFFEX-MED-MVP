import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CalendarPlus, Clock, Hourglass, Lock, Moon, Send } from 'lucide-react';
import { chatApi } from '../api';
import { ApiError } from '../api/http';
import type { Conversation, Message } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { ExtendModal } from '../components/ExtendModal';
import { useToast } from '../components/Toast';
import { useChatEvents, useRealtime } from '../realtime/RealtimeContext';
import { formatAvailability, formatDate, formatDayDivider, isSameDay, remainingLabel } from '../utils/format';
import { Composer } from './Composer';
import { useConversations } from './ConversationsContext';
import { MessageBubble } from './MessageBubble';

interface ChatWindowProps {
  conversation: Conversation;
  backPath: string;
}

export function ChatWindow({ conversation, backPath }: ChatWindowProps) {
  const { user } = useAuth();
  const toast = useToast();
  const { connectionCount, sendTyping } = useRealtime();
  const { markReadLocally, setActiveConversation, reload } = useConversations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | undefined>(undefined);

  const isDoctor = user?.role === 'DOCTOR';
  const myId = user?.id ?? 0;
  const { counterpart, doctorAvailability: availability } = conversation;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    chatApi
      .messages(conversation.id)
      .then((list) => !cancelled && setMessages(list))
      .catch((error: ApiError) => toast({ title: 'Erro ao carregar mensagens', description: error.message, tone: 'error' }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversation.id, connectionCount, toast]);

  useEffect(() => {
    setActiveConversation(conversation.id);
    return () => setActiveConversation(null);
  }, [conversation.id, setActiveConversation]);

  const markRead = useCallback(() => {
    if (document.visibilityState !== 'visible') return;
    markReadLocally(conversation.id);
    chatApi.markAsRead(conversation.id).catch(() => undefined);
  }, [conversation.id, markReadLocally]);

  useEffect(() => {
    markRead();
    const onVisibility = () => document.visibilityState === 'visible' && markRead();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [markRead]);

  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  useChatEvents((event) => {
    if (event.conversationId !== conversation.id) return;
    if (event.type === 'MESSAGE_CREATED') {
      setMessages((list) => (list.some((m) => m.id === event.data.id) ? list : [...list, event.data]));
      if (event.data.senderId !== myId) {
        setTyping(false);
        if (event.data.senderId !== null) markRead();
      }
    } else if (event.type === 'MESSAGES_READ') {
      setMessages((list) =>
        list.map((m) => (m.senderId === myId && !m.readAt ? { ...m, readAt: event.data.readAt } : m)),
      );
    } else if (event.type === 'TYPING') {
      setTyping(true);
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setTyping(false), 3500);
    }
  });

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, loading, typing]);

  const send = async (content: string) => {
    try {
      const message = await chatApi.send(conversation.id, content);
      setMessages((list) => (list.some((m) => m.id === message.id) ? list : [...list, message]));
    } catch (error) {
      toast({ title: 'Mensagem não enviada', description: (error as ApiError).message, tone: 'error' });
      if ((error as ApiError).status === 403) void reload();
      throw error;
    }
  };

  const requestExtension = async () => {
    setRequesting(true);
    try {
      await chatApi.requestExtension(conversation.id);
      toast({ title: 'Solicitação enviada', description: `${counterpart.name} foi avisado(a).`, tone: 'success' });
      await reload();
    } catch (error) {
      toast({ title: 'Não foi possível solicitar', description: (error as ApiError).message, tone: 'error' });
    } finally {
      setRequesting(false);
    }
  };

  const expired = conversation.status === 'EXPIRED';
  const availabilityText = formatAvailability(availability.days, availability.start, availability.end);

  return (
    <div className="chat-window">
      <header className="chat-header">
        <Link to={backPath} className="icon-button chat-header__back" aria-label="Voltar para as conversas">
          <ArrowLeft size={22} />
        </Link>
        <Avatar name={counterpart.name} size={42} photoUrl={counterpart.photoUrl} />
        <div className="chat-header__info">
          <h2>{counterpart.name}</h2>
          <p>{typing ? <span className="typing-text">digitando…</span> : counterpart.detail}</p>
        </div>
        <div className="chat-header__actions">
          {isDoctor ? (
            <>
              <span className={`deadline-chip deadline-chip--${conversation.status.toLowerCase()}`}>
                <CalendarClock size={16} />
                <span>
                  Chat até <b>{formatDate(conversation.expiresOn)}</b>
                  <small>{remainingLabel(conversation.daysRemaining)}</small>
                </span>
              </span>
              <button type="button" className="btn btn--soft" onClick={() => setExtendOpen(true)}>
                <CalendarPlus size={18} />
                <span className="hide-sm">Estender prazo</span>
              </button>
            </>
          ) : (
            <span className={`availability-chip ${availability.availableNow ? '' : 'availability-chip--off'}`}>
              {availability.availableNow ? <Clock size={15} /> : <Moon size={15} />}
              <span>
                <b>{availability.availableNow ? 'Em horário de atendimento' : 'Fora do horário'}</b>
                <small>{availabilityText}</small>
              </span>
            </span>
          )}
        </div>
      </header>

      <div className="chat-banners">
        {isDoctor && conversation.extensionRequested && (
          <div className="banner banner--violet">
            <Hourglass size={18} />
            <span>
              <b>{counterpart.name}</b> solicitou a extensão do prazo da conversa.
            </span>
            <button type="button" className="btn btn--small btn--violet" onClick={() => setExtendOpen(true)}>
              Estender prazo
            </button>
          </div>
        )}
        {isDoctor && expired && !conversation.extensionRequested && (
          <div className="banner banner--danger">
            <Lock size={18} />
            <span>
              Prazo encerrado em <b>{formatDate(conversation.expiresOn)}</b>. O paciente não pode enviar novas mensagens.
            </span>
            <button type="button" className="btn btn--small btn--outline" onClick={() => setExtendOpen(true)}>
              Estender
            </button>
          </div>
        )}
        {conversation.status === 'EXPIRING_SOON' && (
          <div className="banner banner--warning">
            <CalendarClock size={18} />
            <span>
              {isDoctor ? 'O prazo desta conversa' : 'Este chat fica disponível até a data do seu retorno e'}{' '}
              {conversation.daysRemaining === 0 ? 'termina hoje' : `termina em ${conversation.daysRemaining} dia(s)`} (
              {formatDate(conversation.expiresOn)}).
            </span>
          </div>
        )}
        {!isDoctor && !expired && !availability.availableNow && (
          <div className="banner banner--info">
            <Moon size={18} />
            <span>
              {counterpart.name} está fora do horário de atendimento ({availabilityText.toLowerCase()}). Você pode enviar
              sua mensagem normalmente — ela será respondida no próximo horário disponível.
            </span>
          </div>
        )}
      </div>

      <div className="chat-messages" ref={scrollRef}>
        <div className="chat-messages__inner">
          {loading && <div className="chat-messages__loading">Carregando mensagens…</div>}
          {!loading && messages.length === 0 && (
            <div className="chat-intro">
              <Send size={22} />
              {isDoctor ? (
                <span>Envie uma mensagem para iniciar a conversa com {counterpart.name}.</span>
              ) : (
                <span>
                  Envie sua primeira mensagem para {counterpart.name}. O chat fica disponível até{' '}
                  <b>{formatDate(conversation.expiresOn)}</b>.
                </span>
              )}
            </div>
          )}
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const newDay = !previous || !isSameDay(previous.sentAt, message.sentAt);
            const tail =
              newDay || !previous || previous.senderId !== message.senderId || previous.type === 'SYSTEM';
            return (
              <div key={message.id}>
                {newDay && (
                  <div className="day-divider">
                    <span>{formatDayDivider(message.sentAt)}</span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  mine={message.senderId === myId}
                  tail={tail}
                  showOutsideHours={isDoctor}
                />
              </div>
            );
          })}
          {typing && (
            <div className="bubble-row bubble-row--in bubble-row--first">
              <div className="bubble bubble--in bubble--tail typing-bubble" aria-label="Digitando">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>
      </div>

      {conversation.canSend ? (
        <Composer
          onSend={send}
          onTyping={() => sendTyping(conversation.id)}
          placeholder={isDoctor ? `Mensagem para ${counterpart.name}` : 'Digite sua mensagem'}
        />
      ) : (
        !isDoctor && (
          <div className="chat-locked">
            <div className="chat-locked__icon">
              <Lock size={20} />
            </div>
            <div className="chat-locked__text">
              <strong>O prazo desta conversa terminou em {formatDate(conversation.expiresOn)}.</strong>
              <span>
                {conversation.extensionRequested
                  ? 'Sua solicitação de extensão foi enviada. Aguarde o retorno do consultório.'
                  : 'Para continuar conversando, solicite a extensão do prazo ao seu médico.'}
              </span>
            </div>
            {!conversation.extensionRequested && (
              <button type="button" className="btn btn--primary" onClick={requestExtension} disabled={requesting}>
                <CalendarPlus size={18} />
                Solicitar extensão
              </button>
            )}
          </div>
        )
      )}

      {extendOpen && (
        <ExtendModal
          conversationId={conversation.id}
          patientName={counterpart.name}
          expiresOn={conversation.expiresOn}
          status={conversation.status}
          onClose={() => setExtendOpen(false)}
          onExtended={() => void reload()}
        />
      )}
    </div>
  );
}
