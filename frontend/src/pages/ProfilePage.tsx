import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, KeyRound, LoaderCircle, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { profileApi } from '../api';
import type { ApiError } from '../api/http';
import type { ConsentType, Profile, User } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { LegalModal, type LegalDocument } from '../legal/LegalDocuments';
import { formatDateTime } from '../utils/format';
import { toSquareJpeg, validatePhotoFile } from '../utils/image';

const CONSENT_LABELS: Record<ConsentType, { label: string; document?: LegalDocument }> = {
  TERMS_OF_USE: { label: 'Termos de Uso', document: 'terms' },
  PRIVACY_POLICY: { label: 'Política de Privacidade', document: 'privacy' },
  HEALTH_DATA: { label: 'Tratamento de dados de saúde' },
  PROFESSIONAL_DECLARATION: { label: 'Declaração profissional (CRM e sigilo)' },
  MARKETING: { label: 'Novidades por e-mail' },
};

const toUser = ({ id, name, email, role, crm, specialty, photoUrl }: Profile): User => ({
  id,
  name,
  email,
  role,
  crm,
  specialty,
  photoUrl,
});

/** Edição do perfil, usada tanto pelo médico quanto pelo paciente. */
export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const isDoctor = user?.role === 'DOCTOR';

  useEffect(() => {
    profileApi
      .get()
      .then(setProfile)
      .catch((error: ApiError) => toast({ title: 'Erro ao carregar o perfil', description: error.message, tone: 'error' }));
  }, [toast]);

  const apply = (updated: Profile) => {
    setProfile(updated);
    updateUser(toUser(updated));
  };

  return (
    <div className="page page--narrow profile-page">
      {!isDoctor && (
        <Link to="/paciente/conversas" className="back-link">
          <ArrowLeft size={18} /> Voltar às conversas
        </Link>
      )}
      <header className="page-header">
        <div>
          <h1>Meu perfil</h1>
          <p>
            {isDoctor
              ? 'Seus pacientes veem seu nome, sua foto, sua especialidade e seu CRM no chat.'
              : 'Seus médicos veem seu nome e sua foto no chat.'}
          </p>
        </div>
      </header>

      {!profile ? (
        <div className="card empty-state">
          <LoaderCircle className="spin" /> Carregando perfil…
        </div>
      ) : (
        <>
          <PhotoCard profile={profile} onChange={apply} />
          <PersonalDataCard key={profile.id} profile={profile} onChange={apply} />
          <PasswordCard />
          <PrivacyCard profile={profile} onChange={apply} />
        </>
      )}
    </div>
  );
}

function PhotoCard({ profile, onChange }: { profile: Profile; onChange: (profile: Profile) => void }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const isDoctor = profile.role === 'DOCTOR';

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = validatePhotoFile(file);
    if (problem) {
      toast({ title: 'Imagem não aceita', description: problem, tone: 'error' });
      return;
    }
    setBusy('upload');
    try {
      const photo = await toSquareJpeg(file);
      onChange(await profileApi.uploadPhoto(photo));
      toast({ title: 'Foto atualizada', tone: 'success' });
    } catch (error) {
      toast({ title: 'Não foi possível enviar a foto', description: (error as Error).message, tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      onChange(await profileApi.removePhoto());
      toast({ title: 'Foto removida', tone: 'success' });
    } catch (error) {
      toast({ title: 'Não foi possível remover a foto', description: (error as ApiError).message, tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const detail = isDoctor
    ? [profile.specialty, profile.crm && `CRM ${profile.crm}`].filter(Boolean).join(' · ')
    : 'Paciente';

  return (
    <section className="card profile-hero">
      <button
        type="button"
        className="profile-hero__photo"
        onClick={() => inputRef.current?.click()}
        disabled={busy !== null}
        aria-label="Alterar foto"
      >
        <Avatar name={profile.name} size={112} photoUrl={profile.photoUrl} />
        <span className="profile-hero__camera">
          {busy === 'upload' ? <LoaderCircle size={18} className="spin" /> : <Camera size={18} />}
        </span>
      </button>
      <div className="profile-hero__info">
        <h2>{profile.name}</h2>
        <p>{detail}</p>
        <p className="muted">{profile.email}</p>
        <div className="profile-hero__actions">
          <button type="button" className="btn btn--soft btn--small" onClick={() => inputRef.current?.click()} disabled={busy !== null}>
            <Camera size={16} /> {profile.photoUrl ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {profile.photoUrl && (
            <button type="button" className="btn btn--ghost btn--small" onClick={remove} disabled={busy !== null}>
              <Trash2 size={16} /> Remover
            </button>
          )}
        </div>
        <span className="field__hint">
          JPG, PNG ou WebP. A imagem é recortada em formato quadrado e só aparece para{' '}
          {isDoctor ? 'os seus pacientes' : 'os médicos que cadastraram você'}.
        </span>
      </div>
      <input ref={inputRef} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
    </section>
  );
}

function PersonalDataCard({ profile, onChange }: { profile: Profile; onChange: (profile: Profile) => void }) {
  const toast = useToast();
  const isDoctor = profile.role === 'DOCTOR';
  const [form, setForm] = useState({ name: profile.name, crm: profile.crm ?? '', specialty: profile.specialty ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty =
    form.name !== profile.name ||
    (isDoctor && (form.crm !== (profile.crm ?? '') || form.specialty !== (profile.specialty ?? '')));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const updated = await profileApi.update({
        name: form.name,
        ...(isDoctor && { crm: form.crm, specialty: form.specialty }),
      });
      onChange(updated);
      setForm({ name: updated.name, crm: updated.crm ?? '', specialty: updated.specialty ?? '' });
      toast({ title: 'Dados atualizados', tone: 'success' });
    } catch (error) {
      const apiError = error as ApiError;
      setErrors(Object.keys(apiError.fieldErrors ?? {}).length ? apiError.fieldErrors : { form: apiError.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card settings-card">
      <SectionTitle icon={<UserRound size={20} />} title="Dados pessoais" description="Como você aparece para quem conversa com você." />
      <form className="form" onSubmit={submit} noValidate>
        <label className={`field ${errors.name ? 'field--error' : ''}`}>
          <span className="field__label">{isDoctor ? 'Nome profissional' : 'Nome completo'}</span>
          <input
            id="profile-name"
            className="input"
            value={form.name}
            maxLength={120}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          {errors.name && <span className="field__error">{errors.name}</span>}
        </label>
        {isDoctor && (
          <div className="form-row">
            <label className={`field ${errors.crm ? 'field--error' : ''}`}>
              <span className="field__label">CRM</span>
              <input
                id="profile-crm"
                className="input"
                value={form.crm}
                maxLength={30}
                onChange={(event) => setForm({ ...form, crm: event.target.value })}
              />
              {errors.crm && <span className="field__error">{errors.crm}</span>}
            </label>
            <label className={`field ${errors.specialty ? 'field--error' : ''}`}>
              <span className="field__label">Especialidade</span>
              <input
                id="profile-specialty"
                className="input"
                value={form.specialty}
                maxLength={80}
                placeholder="Ex.: Cardiologia"
                onChange={(event) => setForm({ ...form, specialty: event.target.value })}
              />
              {errors.specialty && <span className="field__error">{errors.specialty}</span>}
            </label>
          </div>
        )}
        <label className="field">
          <span className="field__label">E-mail</span>
          <input id="profile-email" className="input" value={profile.email} disabled />
          <span className="field__hint">
            {isDoctor
              ? 'O e-mail é usado para entrar na sua conta e não pode ser alterado aqui.'
              : 'É o e-mail que seus médicos usaram para cadastrar você, por isso não pode ser alterado aqui.'}
          </span>
        </label>
        {errors.form && <div className="form-error">{errors.form}</div>}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={!dirty || saving}>
            {saving ? 'Salvando…' : 'Salvar dados'}
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.next.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.');
    if (form.next !== form.confirm) return setError('A confirmação não confere com a nova senha.');
    setSaving(true);
    try {
      await profileApi.changePassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      toast({ title: 'Senha alterada', tone: 'success' });
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card settings-card">
      <SectionTitle icon={<KeyRound size={20} />} title="Senha" description="Use uma senha que você não usa em outros serviços." />
      <form className="form" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field__label">Senha atual</span>
          <input
            id="password-current"
            className="input"
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={(event) => setForm({ ...form, current: event.target.value })}
          />
        </label>
        <div className="form-row">
          <label className="field">
            <span className="field__label">Nova senha</span>
            <input
              id="password-new"
              className="input"
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={(event) => setForm({ ...form, next: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Confirmar nova senha</span>
            <input
              id="password-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) => setForm({ ...form, confirm: event.target.value })}
            />
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving || !form.current || !form.next || !form.confirm}>
            {saving ? 'Alterando…' : 'Alterar senha'}
          </button>
        </div>
      </form>
    </section>
  );
}

function PrivacyCard({ profile, onChange }: { profile: Profile; onChange: (profile: Profile) => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState<LegalDocument | null>(null);

  const toggleMarketing = async (marketingOptIn: boolean) => {
    setSaving(true);
    try {
      onChange(
        await profileApi.update({
          name: profile.name,
          ...(profile.role === 'DOCTOR' && { crm: profile.crm ?? '', specialty: profile.specialty ?? '' }),
          marketingOptIn,
        }),
      );
      toast({ title: marketingOptIn ? 'Você vai receber novidades por e-mail' : 'Você não vai mais receber novidades', tone: 'success' });
    } catch (error) {
      toast({ title: 'Não foi possível salvar', description: (error as ApiError).message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card settings-card">
      <SectionTitle
        icon={<ShieldCheck size={20} />}
        title="Privacidade"
        description="O que você autorizou no cadastro, conforme a LGPD."
      />
      <label className="toggle-row">
        <span>
          <b>Receber novidades do Effex Med por e-mail</b>
          <small>Opcional. Você pode mudar quando quiser.</small>
        </span>
        <span className={`toggle ${profile.marketingOptIn ? 'toggle--on' : ''}`}>
          <input
            id="profile-marketing"
            type="checkbox"
            checked={profile.marketingOptIn}
            disabled={saving}
            onChange={(event) => void toggleMarketing(event.target.checked)}
          />
          <span className="toggle__thumb" />
        </span>
      </label>
      <ul className="consent-list">
        {profile.consents
          .filter((consent) => consent.type !== 'MARKETING')
          .map((consent) => {
            const info = CONSENT_LABELS[consent.type];
            return (
              <li key={consent.type}>
                <ShieldCheck size={16} />
                <span>
                  {info.document ? (
                    <button type="button" className="link-button" onClick={() => setDocument(info.document!)}>
                      {info.label}
                    </button>
                  ) : (
                    <b>{info.label}</b>
                  )}
                  <small>
                    Versão {consent.documentVersion} · aceito em {formatDateTime(consent.grantedAt)}
                  </small>
                </span>
              </li>
            );
          })}
      </ul>
      <p className="field__hint">
        Para acessar uma cópia dos seus dados, revogar o consentimento de dados de saúde ou excluir sua conta, fale com o
        encarregado de dados (DPO) do Effex Med.
      </p>
      {document && <LegalModal document={document} onClose={() => setDocument(null)} />}
    </section>
  );
}

function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="section-title">
      <span className="section-title__icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
