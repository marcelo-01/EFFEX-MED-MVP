import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Info, LoaderCircle, Stethoscope, UserRound } from 'lucide-react';
import type { ApiError } from '../api/http';
import { homePathFor, useAuth } from '../auth/AuthContext';
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
  const isDoctor = kind === 'medico';

  const update = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrors({});
    try {
      const user = isDoctor
        ? await registerDoctor(form)
        : await registerPatient({ name: form.name, email: form.email, password: form.password });
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
          {error && Object.keys(errors).length === 0 && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
            {submitting ? <LoaderCircle size={20} className="spin" /> : 'Criar conta'}
          </button>
        </form>

        <p className="auth-card__footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </AuthLayout>
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
