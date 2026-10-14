import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Bell, CalendarClock, Moon, SearchX } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { LogoMark } from '../components/Logo';
import { ChatWindow } from './ChatWindow';
import { ConversationList } from './ConversationList';
import { useConversations } from './ConversationsContext';

interface ChatScreenProps {
  sidebarHeader?: ReactNode;
  basePath: string;
}

/**
 * Layout inspirado no WhatsApp: conversas à esquerda e o chat selecionado à direita.
 * Em telas pequenas, mostra uma coisa de cada vez.
 */
export function ChatScreen({ sidebarHeader, basePath }: ChatScreenProps) {
  const { id } = useParams();
  const { user } = useAuth();
  const { conversations, loading } = useConversations();
  const selectedId = id ? Number(id) : null;
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const isDoctor = user?.role === 'DOCTOR';

  return (
    <div className={`chat-screen ${selectedId ? 'chat-screen--open' : ''}`}>
      <ConversationList header={sidebarHeader} title={isDoctor ? 'Conversas' : 'Meus médicos'} />
      <section className="chat-panel">
        {selected ? (
          <ChatWindow key={selected.id} conversation={selected} backPath={basePath} />
        ) : selectedId && !loading ? (
          <div className="chat-empty">
            <SearchX size={48} />
            <h2>Conversa não encontrada</h2>
            <p>Ela pode ter sido removida ou você não tem acesso a ela.</p>
          </div>
        ) : (
          <div className="chat-empty">
            <div className="chat-empty__logo">
              <LogoMark size={72} />
            </div>
            <h2>{isDoctor ? 'Suas conversas em um só lugar' : 'Fale com seus médicos'}</h2>
            <p>
              {isDoctor
                ? 'Selecione um paciente para abrir o chat. Cada conversa fica disponível até a data do retorno.'
                : 'Selecione um médico ao lado para enviar uma mensagem.'}
            </p>
            {isDoctor && (
              <ul className="chat-empty__tips">
                <li>
                  <Bell size={16} /> Alertas apenas dentro do seu horário de notificações
                </li>
                <li>
                  <Moon size={16} /> Mensagens recebidas fora do horário ficam marcadas
                </li>
                <li>
                  <CalendarClock size={16} /> O paciente só envia mensagens até o prazo definido
                </li>
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
