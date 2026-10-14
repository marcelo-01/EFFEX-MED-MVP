import { useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Info, LoaderCircle, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import type { ApiError } from '../api/http';
import { STANDALONE } from '../config';
import { homePathFor, useAuth } from '../auth/AuthContext';
import { LegalModal, type LegalDocument } from '../legal/LegalDocuments';
import { AuthLayout } from './AuthLayout';

type Kind = 'medico' | 'paciente';

export function RegisterPage() {
  const { tipo } = useParams();
  if (tipo !== 'medico' && tipo !== 'paciente') return <Navigate to="/cadastro/medico" replace />;
  return <RegisterForm key={tipo} kind={tipo} />;
}

function RegisterForm({ kind }: { kind: Kind }) {
  const { registerDoctor, registerPatient } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', crm: '', specialty: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // LGPD: nenhum aceite vem marcado; o consentimento precisa ser uma ação do próprio usuário.
  const [consents, setConsents] = useState({
    acceptTerms: false,
    acceptPrivacyPolicy: false,
    professionalDeclaration: false,
    consentHealthData: false,
    marketingOptIn: false,
  });
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const isDoctor = kind === 'medico';

  const update = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const toggle = (field: keyof typeof consents) => (checked: boolean) => {
    setConsents((current) => ({ ...current, [field]: checked }));
    if (checked) setErrors(({ [field]: _removed, ...rest }) => rest);
  };

  const openDocument = (document: LegalDocument) => (event: MouseEvent) => {
    event.preventDefault();
    setLegalDocument(document);
  };

  const missingConsents = () => {
    const missing: Record<string, string> = {};
    if (!consents.acceptTerms) missing.acceptTerms = 'Aceite os Termos de Uso para continuar.';
    if (!consents.acceptPrivacyPolicy) missing.acceptPrivacyPolicy = 'Aceite a Política de Privacidade para continuar.';
    if (isDoctor && !consents.professionalDeclaration) {
      missing.professionalDeclaration = 'Confirme a declaração profissional para continuar.';
    }
    if (!isDoctor && !consents.consentHealthData) {
      missing.consentHealthData = 'Autorize o uso dos dados de saúde para conversar com seus médicos.';
    }
    return missing;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const missing = missingConsents();
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      return;
    }
    setSubmitting(true);
    setErrors({});
    const { acceptTerms, acceptPrivacyPolicy, marketingOptIn } = consents;
    try {
      const user = isDoctor
        ? await registerDoctor({
            ...form,
            acceptTerms,
            acceptPrivacyPolicy,
            marketingOptIn,
            professionalDeclaration: consents.professionalDeclaration,
          })
        : await registerPatient({
            name: form.name,
            email: form.email,
            password: form.password,
            acceptTerms,
            acceptPrivacyPolicy,
            marketingOptIn,
            consentHealthData: consents.consentHealthData,
          });
      navigate(homePathFor(user), { replace: true });
    } catch (err) {
      const apiError = err as ApiError;
      setErrors(apiError.fieldErrors ?? {});
      setError(apiError.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>Criar conta</h2>
        <p className="auth-card__subtitle">Escolha o tipo de conta para começar.</p>

        <div className="segmented" role="tablist">
          <Link to="/cadastro/medico" role="tab" aria-selected={isDoctor} className={isDoctor ? 'active' : ''}>
            <Stethoscope size={18} /> Sou médico
          </Link>
          <Link to="/cadastro/paciente" role="tab" aria-selected={!isDoctor} className={!isDoctor ? 'active' : ''}>
            <UserRound size={18} /> Sou paciente
          </Link>
        </div>

        {!isDoctor && (
          <div className="callout">
            <Info size={18} />
            <span>
              Use o <b>mesmo e-mail</b> que você informou ao seu médico. As conversas com os médicos que cadastraram você
              aparecerão automaticamente.
            </span>
          </div>
        )}

        <form className="form" onSubmit={onSubmit} noValidate>
          <Field label={isDoctor ? 'Nome profissional' : 'Nome completo'} error={errors.name}>
            <input
              className="input"
              value={form.name}
              onChange={update('name')}
              placeholder={isDoctor ? 'Ex.: Dra. Ana Souza' : 'Seu nome'}
              autoComplete="name"
            />
          </Field>
          {isDoctor && (
            <div className="form-row">
              <Field label="CRM" error={errors.crm}>
                <input className="input" value={form.crm} onChange={update('crm')} placeholder="123456-SP" />
              </Field>
              <Field label="Especialidade" error={errors.specialty}>
                <input
                  className="input"
                  value={form.specialty}
                  onChange={update('specialty')}
                  placeholder="Ex.: Cardiologia"
                />
              </Field>
            </div>
          )}
          <Field label="E-mail" error={errors.email}>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </Field>
          <Field label="Senha" error={errors.password} hint="Mínimo de 6 caracteres">
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="Crie uma senha"
              autoComplete="new-password"
            />
          </Field>

          <fieldset className="consents">
            <legend>Termos e privacidade</legend>
            <Consent id="consent-terms" checked={consents.acceptTerms} onChange={toggle('acceptTerms')} error={errors.acceptTerms}>
              Li e aceito os{' '}
              <button type="button" className="link-button" onClick={openDocument('terms')}>
                Termos de Uso
              </button>
              .
            </Consent>
            <Consent
              id="consent-privacy"
              checked={consents.acceptPrivacyPolicy}
              onChange={toggle('acceptPrivacyPolicy')}
              error={errors.acceptPrivacyPolicy}
            >
              Li e estou ciente da{' '}
              <button type="button" className="link-button" onClick={openDocument('privacy')}>
                Política de Privacidade
              </button>
              , que explica como meus dados são tratados.
            </Consent>
            {isDoctor ? (
              <Consent
                id="consent-professional"
                checked={consents.professionalDeclaration}
                onChange={toggle('professionalDeclaration')}
                error={errors.professionalDeclaration}
              >
                Declaro que sou médico(a) com inscrição ativa no CRM informado e que manterei o sigilo das informações dos
                meus pacientes, conforme o Código de Ética Médica e a LGPD.
              </Consent>
            ) : (
              <Consent
                id="consent-health"
                highlighted
                checked={consents.consentHealthData}
                onChange={toggle('consentHealthData')}
                error={errors.consentHealthData}
              >
                <b>Autorizo o tratamento dos meus dados de saúde</b> (como sintomas, exames e medicamentos que eu informar
                no chat) para a comunicação com os médicos que me cadastrarem, conforme o art. 11, I, da LGPD. Posso
                revogar esta autorização quando quiser.
              </Consent>
            )}
            <Consent id="consent-marketing" checked={consents.marketingOptIn} onChange={toggle('marketingOptIn')} optional>
              Quero receber novidades do Effex Med por e-mail.
            </Consent>
            <p className="consents__note">
              <ShieldCheck size={16} />
              <span>
                Seus dados são protegidos pela LGPD (Lei nº 13.709/2018). Você pode acessar, corrigir ou excluir seus dados
                e revogar consentimentos a qualquer momento.
              </span>
            </p>
          </fieldset>

          {error && Object.keys(errors).length === 0 && <div className="form-error">{error}</div>}
          {STANDALONE && (
            <span className="field__hint">Versão de demonstração: os dados ficam só neste navegador. Não use uma senha real.</span>
          )}
          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
            {submitting ? <LoaderCircle size={20} className="spin" /> : 'Criar conta'}
          </button>
        </form>

        <p className="auth-card__footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
      {legalDocument && <LegalModal document={legalDocument} onClose={() => setLegalDocument(null)} />}
    </AuthLayout>
  );
}

interface ConsentProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  optional?: boolean;
  /** Consentimento para dados sensíveis: a LGPD pede que seja específico e destacado (art. 11, I). */
  highlighted?: boolean;
  children: ReactNode;
}

function Consent({ id, checked, onChange, error, optional = false, highlighted = false, children }: ConsentProps) {
  return (
    <div className={`consent ${highlighted ? 'consent--highlighted' : ''} ${error ? 'consent--error' : ''}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label htmlFor={id}>
        {children}
        {optional ? <span className="consent__tag">opcional</span> : <span className="consent__required" aria-label="obrigatório">*</span>}
      </label>
      {error && (
        <span id={`${id}-error`} className="field__error consent__error">
          {error}
        </span>
      )}
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={`field ${error ? 'field--error' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
