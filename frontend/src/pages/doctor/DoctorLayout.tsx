import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { LogOut, MessageCircle, Settings, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ConversationsProvider, useConversations } from '../../chat/ConversationsContext';
import { Avatar } from '../../components/Avatar';
import { LogoMark } from '../../components/Logo';

export function DoctorLayout() {
  return (
    <ConversationsProvider>
      <DoctorShell />
    </ConversationsProvider>
  );
}

function DoctorShell() {
  const { user, logout } = useAuth();
  const { totalUnread, conversations } = useConversations();
  const inConversation = useMatch('/medico/conversas/:id');
  const extensionRequests = conversations.filter((c) => c.extensionRequested).length;

  return (
    <div className={`app-shell ${inConversation ? 'app-shell--in-chat' : ''}`}>
      <nav className="rail" aria-label="Menu principal">
        <div className="rail__logo">
          <LogoMark size={38} />
        </div>
        <div className="rail__items">
          <RailLink to="/medico/conversas" icon={<MessageCircle size={22} />} label="Conversas" badge={totalUnread} />
          <RailLink
            to="/medico/pacientes"
            icon={<Users size={22} />}
            label="Pacientes"
            badge={extensionRequests}
            badgeTone="violet"
          />
          <RailLink to="/medico/configuracoes" icon={<Settings size={22} />} label="Ajustes" />
        </div>
        <div className="rail__footer">
          <div className="rail__user" title={`${user?.name}\n${user?.email}`}>
            <Avatar name={user?.name ?? ''} size={38} />
          </div>
          <button type="button" className="rail__item" onClick={logout}>
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function RailLink({
  to,
  icon,
  label,
  badge = 0,
  badgeTone = 'primary',
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeTone?: 'primary' | 'violet';
}) {
  return (
    <NavLink to={to} className={({ isActive }) => `rail__item ${isActive ? 'rail__item--active' : ''}`}>
      <span className="rail__icon">
        {icon}
        {badge > 0 && <span className={`rail__badge rail__badge--${badgeTone}`}>{badge > 99 ? '99+' : badge}</span>}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}
