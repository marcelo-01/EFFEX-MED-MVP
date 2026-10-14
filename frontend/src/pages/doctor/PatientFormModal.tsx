import { useState, type FormEvent } from 'react';
import { Info, Pencil, UserPlus } from 'lucide-react';
import { patientsApi } from '../../api';
import type { ApiError } from '../../api/http';
import type { Patient } from '../../api/types';
import { Modal } from '../../components/Modal';
import { addDays, formatDate, toLocalDateValue } from '../../utils/format';

interface PatientFormModalProps {
  /** Paciente a editar; ausente para um novo cadastro. */
  patient?: Patient;
  defaultConversationDays: number;
  onClose: () => void;
  onSaved: (patient: Patient, created: boolean) => void;
}

export function PatientFormModal({ patient, defaultConversationDays, onClose, onSaved }: PatientFormModalProps) {
  const editing = Boolean(patient);
  const today = toLocalDateValue(new Date());
  const defaultDate = toLocalDateValue(addDays(new Date(), defaultConversationDays));
  const [email, setEmail] = useState(patient?.email ?? '');
  const [name, setName] = useState(patient && patient.name !== patient.email ? patient.name : '');
  const [expiresOn, setExpiresOn] = useState(patient?.expiresOn ?? defaultDate);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setErrors({});
    try {
      const saved = patient
        ? await patientsApi.update(patient.conversationId, { name: name.trim() || undefined, expiresOn })
        : await patientsApi.register({ email: email.trim(), name: name.trim() || undefined, expiresOn });
      onSaved(saved, !editing);
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setErrors(apiError.fieldErrors ?? {});
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Editar paciente' : 'Cadastrar paciente'}
      subtitle={editing ? patient?.email : 'Libere o chat para um paciente até a data do retorno.'}
      icon={editing ? <Pencil size={20} /> : <UserPlus size={22} />}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="patient-form" className="btn btn--primary" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar paciente'}
          </button>
        </>
      }
    >
      <form id="patient-form" className="form" onSubmit={submit} noValidate>
        {!editing && (
          <label className={`field ${errors.email ? 'field--error' : ''}`}>
            <span className="field__label">E-mail do paciente *</span>
            <input
              className="input"
              type="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="paciente@email.com"
            />
            {errors.email && <span className="field__error">{errors.email}</span>}
          </label>
        )}
        {(!editing || !patient?.registered) && (
          <label className={`field ${errors.name ? 'field--error' : ''}`}>
            <span className="field__label">Nome do paciente (opcional)</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Para identificar o paciente até ele criar a conta"
            />
            {errors.name && <span className="field__error">{errors.name}</span>}
          </label>
        )}
        <label className={`field ${errors.expiresOn ? 'field--error' : ''}`}>
          <span className="field__label">Data do retorno (fim do chat)</span>
          <input
            className="input"
            type="date"
            min={today}
            value={expiresOn}
            onChange={(event) => setExpiresOn(event.target.value)}
            required
          />
          <span className="field__hint">
            O paciente pode enviar mensagens até {expiresOn ? formatDate(expiresOn) : '—'}.
            {!editing && ` Padrão das configurações: ${defaultConversationDays} dias.`}
          </span>
        </label>
        {!editing && (
          <div className="callout">
            <Info size={18} />
            <span>
              Se o paciente ainda não tiver conta, a conversa aparece para ele assim que se cadastrar com este e-mail.
            </span>
          </div>
        )}
        {error && Object.keys(errors).length === 0 && <div className="form-error">{error}</div>}
      </form>
    </Modal>
  );
}
