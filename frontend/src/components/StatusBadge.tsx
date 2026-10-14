import type { ConversationStatus } from '../api/types';

interface StatusBadgeProps {
  status: ConversationStatus;
  daysRemaining: number;
  registered?: boolean;
  compact?: boolean;
}

export function StatusBadge({ status, daysRemaining, registered = true, compact = false }: StatusBadgeProps) {
  if (!registered) {
    return <span className="badge badge--neutral">Aguardando cadastro</span>;
  }
  if (status === 'EXPIRED') {
    return <span className="badge badge--danger">{compact ? 'Expirado' : 'Prazo encerrado'}</span>;
  }
  if (status === 'EXPIRING_SOON') {
    const label = daysRemaining === 0 ? 'Expira hoje' : `Expira em ${daysRemaining}d`;
    return <span className="badge badge--warning">{label}</span>;
  }
  return <span className="badge badge--success">Ativo</span>;
}

export function ExtensionRequestedBadge() {
  return <span className="badge badge--violet">Pediu extensão</span>;
}
