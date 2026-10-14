import { useMemo, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Bot, Check, CheckCheck, Info, MessageCircle, Search, X } from 'lucide-react';
import type { Conversation } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { ExtensionRequestedBadge, StatusBadge } from '../components/StatusBadge';
import { formatListDate } from '../utils/format';
import { useConversations } from './ConversationsContext';

type Filter = 'all' | 'unread' | 'expiring' | 'expired';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'Não lidas' },
  { value: 'expiring', label: 'Expirando' },
  { value: 'expired', label: 'Expiradas' },
];

interface ConversationListProps {
  header?: ReactNode;
  title: string;
}

export function ConversationList({ header, title }: ConversationListProps) {
  const { user } = useAuth();
  const { conversations, loading, chatPath } = useConversations();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const isDoctor = user?.role === 'DOCTOR';

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (term && !`${c.counterpart.name} ${c.counterpart.email}`.toLowerCase().includes(term)) return false;
      if (filter === 'unread') return c.unreadCount > 0;
      if (filter === 'expiring') return c.status === 'EXPIRING_SOON';
      if (filter === 'expired') return c.status === 'EXPIRED';
      return true;
    });
  }, [conversations, query, filter]);

  return (
    <aside className="conversation-sidebar">
      {header}
      <div className="conversation-sidebar__top">
        <h1>{title}</h1>
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isDoctor ? 'Pesquisar paciente' : 'Pesquisar médico'}
            aria-label="Pesquisar conversas"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Limpar pesquisa">
              <X size={16} />
            </button>
          )}
        </label>
        {isDoctor && (
          <div className="chip-row" role="tablist" aria-label="Filtrar conversas">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                className={`chip ${filter === option.value ? 'chip--active' : ''}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="conversation-list" aria-label="Conversas">
        {loading && <ConversationSkeleton />}
        {!loading && conversations.length === 0 && (
          <div className="conversation-list__empty">
            <MessageCircle size={36} />
            {isDoctor ? (
              <>
                <strong>Nenhuma conversa ainda</strong>
                <span>
                  Cadastre pacientes na aba <b>Pacientes</b>. A conversa aparece aqui assim que o paciente criar a conta.
                </span>
              </>
            ) : (
              <>
                <strong>Nenhum médico vinculado</strong>
                <span>
                  Peça ao seu médico para cadastrar o e-mail <b>{user?.email}</b> no Effex Med. A conversa aparecerá aqui
                  automaticamente.
                </span>
              </>
            )}
          </div>
        )}
        {!loading && conversations.length > 0 && visible.length === 0 && (
          <div className="conversation-list__empty">
            <Search size={30} />
            <span>Nenhuma conversa encontrada.</span>
          </div>
        )}
        {visible.map((conversation) => (
          <NavLink
            key={conversation.id}
            to={chatPath(conversation.id)}
            className={({ isActive }) => `conversation-item ${isActive ? 'conversation-item--active' : ''}`}
          >
            <Avatar name={conversation.counterpart.name} size={48} photoUrl={conversation.counterpart.photoUrl} />
            <div className="conversation-item__body">
              <div className="conversation-item__row">
                <span className="conversation-item__name">{conversation.counterpart.name}</span>
                {conversation.lastMessage && (
                  <span
                    className={`conversation-item__time ${conversation.unreadCount > 0 ? 'conversation-item__time--unread' : ''}`}
                  >
                    {formatListDate(conversation.lastMessage.sentAt)}
                  </span>
                )}
              </div>
              <div className="conversation-item__row">
                <span className="conversation-item__preview">
                  <Preview conversation={conversation} myId={user?.id ?? 0} />
                </span>
                {conversation.unreadCount > 0 && <span className="unread-badge">{conversation.unreadCount}</span>}
              </div>
              {(conversation.status !== 'ACTIVE' || (isDoctor && conversation.extensionRequested)) && (
                <div className="conversation-item__tags">
                  {conversation.status !== 'ACTIVE' && (
                    <StatusBadge status={conversation.status} daysRemaining={conversation.daysRemaining} compact />
                  )}
                  {isDoctor && conversation.extensionRequested && <ExtensionRequestedBadge />}
                </div>
              )}
            </div>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Preview({ conversation, myId }: { conversation: Conversation; myId: number }) {
  const message = conversation.lastMessage;
  if (!message) return <em>Nenhuma mensagem ainda</em>;
  if (message.type === 'SYSTEM') {
    return (
      <span className="preview preview--system">
        <Info size={14} /> {message.content}
      </span>
    );
  }
  const mine = message.senderId === myId;
  return (
    <span className="preview">
      {mine &&
        (message.readAt ? (
          <CheckCheck size={16} className="tick tick--read" />
        ) : (
          <Check size={16} className="tick" />
        ))}
      {message.type === 'AUTO_REPLY' && <Bot size={14} />}
      <span className="preview__text">{message.content}</span>
    </span>
  );
}

function ConversationSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="conversation-item conversation-item--skeleton">
          <div className="skeleton skeleton--circle" />
          <div className="conversation-item__body">
            <div className="skeleton skeleton--line" style={{ width: '55%' }} />
            <div className="skeleton skeleton--line" style={{ width: '85%' }} />
          </div>
        </div>
      ))}
    </>
  );
}
