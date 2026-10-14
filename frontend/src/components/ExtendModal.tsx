import { useEffect, useState } from 'react';
import { CalendarPlus, History } from 'lucide-react';
import { patientsApi } from '../api';
import type { ApiError } from '../api/http';
import type { ConversationStatus, Extension, Patient } from '../api/types';
import { addDays, formatDate, formatDateTime, parseLocalDate, pluralDays, toLocalDateValue } from '../utils/format';
import { Modal } from './Modal';
import { useToast } from './Toast';

const QUICK_OPTIONS = [7, 15, 30, 60];
const DEFAULT_DAYS = 15;

interface ExtendModalProps {
  conversationId: number;
  patientName: string;
  expiresOn: string;
  status: ConversationStatus;
  onClose: () => void;
  onExtended?: (patient: Patient) => void;
}

/**
 * Estende o prazo da conversa pela quantidade de dias desejada.
 * Neste MVP o pagamento da extensão é tratado fora da plataforma; aqui fica apenas o registro.
 */
export function ExtendModal({ conversationId, patientName, expiresOn, status, onClose, onExtended }: ExtendModalProps) {
  const toast = useToast();
  const [days, setDays] = useState<number | ''>(DEFAULT_DAYS);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<Extension[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    patientsApi
      .extensions(conversationId)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [conversationId]);

  const expired = status === 'EXPIRED';
  const base = expired ? new Date() : parseLocalDate(expiresOn);
  const newDate = typeof days === 'number' && days > 0 ? toLocalDateValue(addDays(base, days)) : null;

  const submit = async () => {
    if (typeof days !== 'number' || days < 1) return;
    setSaving(true);
    try {
      const patient = await patientsApi.extend(conversationId, days, note.trim() || undefined);
      toast({
        title: 'Prazo estendido',
        description: `${patientName} pode conversar até ${formatDate(patient.expiresOn)}.`,
        tone: 'success',
      });
      onExtended?.(patient);
      onClose();
    } catch (error) {
      toast({ title: 'Não foi possível estender', description: (error as ApiError).message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Estender prazo da conversa"
      subtitle={patientName}
      icon={<CalendarPlus size={22} />}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={submit}
            disabled={saving || typeof days !== 'number' || days < 1 || days > 365}
          >
            {saving ? 'Salvando…' : 'Confirmar extensão'}
          </button>
        </>
      }
    >
      <div className="extend-summary">
        <div>
          <span>Prazo atual</span>
          <strong className={expired ? 'text-danger' : ''}>{formatDate(expiresOn)}</strong>
          {expired && <small className="text-danger">Encerrado</small>}
        </div>
        <div className="extend-summary__arrow">→</div>
        <div>
          <span>Novo prazo</span>
          <strong className="text-primary">{newDate ? formatDate(newDate) : '—'}</strong>
        </div>
      </div>

      <div className="field">
        <span className="field__label">Estender por</span>
        <div className="chip-row">
          {QUICK_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip chip--lg ${days === option ? 'chip--active' : ''}`}
              onClick={() => setDays(option)}
            >
              {pluralDays(option)}
            </button>
          ))}
          <label className="input-suffix">
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              aria-label="Quantidade de dias"
              onChange={(event) => setDays(event.target.value === '' ? '' : Number(event.target.value))}
            />
            <span>dias</span>
          </label>
        </div>
        {expired && (
          <span className="field__hint">Como o prazo já terminou, a contagem começa a partir de hoje.</span>
        )}
      </div>

      <label className="field">
        <span className="field__label">Observação (opcional)</span>
        <input
          className="input"
          value={note}
          maxLength={255}
          placeholder="Ex.: pagamento confirmado na recepção"
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      {history && history.length > 0 && (
        <div className="extend-history">
          <span className="field__label">
            <History size={15} /> Extensões anteriores
          </span>
          <ul>
            {history.map((item) => (
              <li key={item.id}>
                <b>+{pluralDays(item.days)}</b>
                <span>
                  até {formatDate(item.newExpiresOn)} · {formatDateTime(item.createdAt)}
                </span>
                {item.note && <em>{item.note}</em>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
