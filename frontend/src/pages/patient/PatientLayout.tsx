import { LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ChatScreen } from '../../chat/ChatScreen';
import { ConversationsProvider } from '../../chat/ConversationsContext';
import { Avatar } from '../../components/Avatar';
import { LogoMark } from '../../components/Logo';

/** Visão do paciente: neste MVP, apenas o chat com os médicos que o cadastraram. */
export function PatientLayout() {
  const { user, logout } = useAuth();
  return (
    <ConversationsProvider>
      <div className="app-shell app-shell--patient">
        <main className="app-main">
          <ChatScreen
            basePath="/paciente/conversas"
            sidebarHeader={
              <div className="profile-bar">
                <Avatar name={user?.name ?? ''} size={40} />
                <div className="profile-bar__info">
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>
                <span className="profile-bar__brand" aria-hidden="true">
                  <LogoMark size={28} />
                </span>
                <button type="button" className="icon-button" onClick={logout} aria-label="Sair" title="Sair">
                  <LogOut size={20} />
                </button>
              </div>
            }
          />
        </main>
      </div>
    </ConversationsProvider>
  );
}
