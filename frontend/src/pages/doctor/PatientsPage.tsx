import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CalendarPlus,
  CircleCheck,
  Hourglass,
  Lock,
  MailCheck,
  MessageCircle,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { patientsApi } from '../../api';
import type { ApiError } from '../../api/http';
import type { Patient } from '../../api/types';
import { Avatar } from '../../components/Avatar';
import { ExtendModal } from '../../components/ExtendModal';
import { Modal } from '../../components/Modal';
import { ExtensionRequestedBadge, StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { useChatEvents } from '../../realtime/RealtimeContext';
import { formatDate, formatListDate, remainingLabel } from '../../utils/format';
import { PatientFormModal } from './PatientFormModal';

type Filter = 'all' | 'active' | 'expiring' | 'expired' | 'pending' | 'requests';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'expiring', label: 'Expirando' },
  { value: 'expired', label: 'Expirados' },
  { value: 'pending', label: 'Aguardando cadastro' },
  { value: 'requests', label: 'Pedidos de extensão' },
];

function matches(patient: Patient, filter: Filter) {
  switch (filter) {
    case 'active':
      return patient.registered && patient.status !== 'EXPIRED';
    case 'expiring':
      return patient.status === 'EXPIRING_SOON';
    case 'expired':
      return patient.status === 'EXPIRED';
    case 'pending':
      return !patient.registered;
    case 'requests':
      return patient.extensionRequested;
    default:
      return true;
  }
}

export function PatientsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [extending, setExtending] = useState<Patient | null>(null);
  const [removing, setRemoving] = useState<Patient | null>(null);

  const load = useCallback(async () => {
    try {
      setPatients(await patientsApi.list());
    } catch (error) {
      toast({ title: 'Erro ao carregar pacientes', description: (error as ApiError).message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Mantém a tabela atualizada com novas mensagens, cadastros de pacientes e pedidos de extensão.
  useChatEvents((event) => {
    if (event.type === 'MESSAGE_CREATED' || event.type === 'CONVERSATION_UPDATED') void load();
  });

  const stats = useMemo(
    () => ({
      active: patients.filter((p) => p.registered && p.status !== 'EXPIRED').length,
      expiring: patients.filter((p) => p.status === 'EXPIRING_SOON').length,
      expired: patients.filter((p) => p.status === 'EXPIRED').length,
      pending: patients.filter((p) => !p.registered).length,
      requests: patients.filter((p) => p.extensionRequested).length,
    }),
    [patients],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return patients.filter(
      (p) => matches(p, filter) && (!term || `${p.name} ${p.email}`.toLowerCase().includes(term)),
    );
  }, [patients, query, filter]);

  const upsert = (patient: Patient, created: boolean) => {
    setPatients((list) =>
      created ? [patient, ...list] : list.map((p) => (p.conversationId === patient.conversationId ? patient : p)),
    );
    if (created) {
      toast({
        title: 'Paciente cadastrado',
        description: patient.registered
          ? `${patient.name} já tem conta: o chat está disponível.`
          : 'O chat aparecerá para o paciente quando ele criar a conta com este e-mail.',
        tone: 'success',
      });
    } else {
      toast({ title: 'Paciente atualizado', tone: 'success' });
    }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await patientsApi.remove(removing.conversationId);
      setPatients((list) => list.filter((p) => p.conversationId !== removing.conversationId));
      toast({ title: 'Paciente removido', tone: 'success' });
    } catch (error) {
      toast({ title: 'Não foi possível remover', description: (error as ApiError).message, tone: 'error' });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Pacientes</h1>
          <p>Cadastre o e-mail do paciente para liberar o chat até a data do retorno.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
          <UserPlus size={18} /> Cadastrar paciente
        </button>
      </header>

      <div className="stats-grid">
        <StatCard icon={<CircleCheck size={20} />} tone="success" label="Conversas ativas" value={stats.active} onClick={() => setFilter('active')} />
        <StatCard icon={<CalendarClock size={20} />} tone="warning" label="Expirando em até 3 dias" value={stats.expiring} onClick={() => setFilter('expiring')} />
        <StatCard icon={<Lock size={20} />} tone="danger" label="Prazos encerrados" value={stats.expired} onClick={() => setFilter('expired')} />
        <StatCard icon={<MailCheck size={20} />} tone="neutral" label="Aguardando cadastro" value={stats.pending} onClick={() => setFilter('pending')} />
        <StatCard icon={<Hourglass size={20} />} tone="violet" label="Pedidos de extensão" value={stats.requests} onClick={() => setFilter('requests')} />
      </div>

      <section className="card">
        <div className="table-toolbar">
          <label className="search-field search-field--outlined">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" />
          </label>
          <div className="chip-row">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`chip ${filter === option.value ? 'chip--active' : ''}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Carregando pacientes…</div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <Users size={40} />
            <strong>Nenhum paciente cadastrado</strong>
            <span>Comece cadastrando o e-mail de um paciente atendido.</span>
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              <UserPlus size={18} /> Cadastrar paciente
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <Search size={32} />
            <span>Nenhum paciente encontrado com esses filtros.</span>
          </div>
        ) : (
          <div className="patient-table" role="table">
            <div className="patient-table__head" role="row">
              <span>Paciente</span>
              <span>Situação</span>
              <span>Prazo do chat</span>
              <span>Última mensagem</span>
              <span className="align-right">Ações</span>
            </div>
            {visible.map((patient) => (
              <div key={patient.conversationId} className="patient-row" role="row">
                <div className="patient-row__person">
                  <Avatar name={patient.name} size={40} muted={!patient.registered} photoUrl={patient.photoUrl} />
                  <div className="patient-row__names">
                    <strong>{patient.name}</strong>
                    <span>{patient.email}</span>
                  </div>
                </div>
                <div className="patient-row__status">
                  <StatusBadge status={patient.status} daysRemaining={patient.daysRemaining} registered={patient.registered} />
                  {patient.extensionRequested && <ExtensionRequestedBadge />}
                </div>
                <div className="patient-row__deadline">
                  <strong>{formatDate(patient.expiresOn)}</strong>
                  <span className={patient.status === 'EXPIRED' ? 'text-danger' : patient.status === 'EXPIRING_SOON' ? 'text-warning' : ''}>
                    {remainingLabel(patient.daysRemaining)}
                  </span>
                  {patient.extensionCount > 0 && (
                    <small className="muted">
                      {patient.extensionCount === 1 ? '1 extensão registrada' : `${patient.extensionCount} extensões registradas`}
                    </small>
                  )}
                </div>
                <div className="patient-row__last">
                  {patient.lastMessageAt ? formatListDate(patient.lastMessageAt) : <span className="muted">—</span>}
                  {patient.unreadCount > 0 && <span className="unread-badge">{patient.unreadCount}</span>}
                </div>
                <div className="patient-row__actions">
                  <button
                    type="button"
                    className="icon-button icon-button--labeled"
                    disabled={!patient.registered}
                    title={patient.registered ? 'Abrir chat' : 'Disponível quando o paciente criar a conta'}
                    onClick={() => navigate(`/medico/conversas/${patient.conversationId}`)}
                  >
                    <MessageCircle size={18} />
                    <span>Chat</span>
                  </button>
                  <button
                    type="button"
                    className={`icon-button icon-button--labeled ${patient.extensionRequested ? 'icon-button--highlight' : ''}`}
                    title="Estender prazo"
                    onClick={() => setExtending(patient)}
                  >
                    <CalendarPlus size={18} />
                    <span>Estender</span>
                  </button>
                  <button type="button" className="icon-button" title="Editar" onClick={() => setEditing(patient)}>
                    <Pencil size={17} />
                  </button>
                  {patient.removable && (
                    <button type="button" className="icon-button icon-button--danger" title="Remover" onClick={() => setRemoving(patient)}>
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {creating && (
        <PatientFormModal onClose={() => setCreating(false)} onSaved={upsert} />
      )}
      {editing && (
        <PatientFormModal patient={editing} onClose={() => setEditing(null)} onSaved={upsert} />
      )}
      {extending && (
        <ExtendModal
          conversationId={extending.conversationId}
          patientName={extending.name}
          expiresOn={extending.expiresOn}
          status={extending.status}
          onClose={() => setExtending(null)}
          onExtended={(patient) => setPatients((list) => list.map((p) => (p.conversationId === patient.conversationId ? patient : p)))}
        />
      )}
      {removing && (
        <Modal
          title="Remover paciente"
          subtitle={removing.email}
          icon={<Trash2 size={20} />}
          onClose={() => setRemoving(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setRemoving(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn--danger" onClick={remove}>
                Remover
              </button>
            </>
          }
        >
          <p>
            Deseja remover <b>{removing.name}</b> da sua lista? Como ainda não há mensagens trocadas, nenhum histórico será
            perdido.
          </p>
        </Modal>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'violet';
  onClick: () => void;
}) {
  return (
    <button type="button" className={`stat-card stat-card--${tone}`} onClick={onClick}>
      <span className="stat-card__icon">{icon}</span>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </button>
  );
}
