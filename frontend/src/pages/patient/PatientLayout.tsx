import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Pencil } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ChatScreen } from '../../chat/ChatScreen';
import { ConversationsProvider } from '../../chat/ConversationsContext';
import { Avatar } from '../../components/Avatar';

/** Área do paciente: o chat com os médicos que o cadastraram e a edição do perfil. */
export function PatientLayout() {
  return (
    <ConversationsProvider>
      <div className="app-shell app-shell--patient">
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </ConversationsProvider>
  );
}

export function PatientChat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <ChatScreen
      basePath="/paciente/conversas"
      sidebarHeader={
        <div className="profile-bar">
          <button
            type="button"
            className="profile-bar__profile"
            onClick={() => navigate('/paciente/perfil')}
            title="Editar perfil"
          >
            <Avatar name={user?.name ?? ''} size={40} photoUrl={user?.photoUrl} />
            <span className="profile-bar__info">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </span>
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => navigate('/paciente/perfil')}
            aria-label="Editar perfil"
            title="Editar perfil"
          >
            <Pencil size={18} />
          </button>
          <button type="button" className="icon-button" onClick={logout} aria-label="Sair" title="Sair">
            <LogOut size={20} />
          </button>
        </div>
      }
    />
  );
}
