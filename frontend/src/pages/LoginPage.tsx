import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Eye, EyeOff, LoaderCircle, Stethoscope, UserRound } from 'lucide-react';
import type { ApiError } from '../api/http';
import { homePathFor, useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { STANDALONE } from '../config';
import { AuthLayout } from './AuthLayout';

/** Contas criadas pelo DemoDataLoader do backend (senha: demo123). */
const DEMO_ACCOUNTS = [
  { name: 'Dra. Ana Souza', email: 'ana@effexmed.com', role: 'Médica · Cardiologia', doctor: true },
  { name: 'Dr. Carlos Mendes', email: 'carlos@effexmed.com', role: 'Médico · Clínica Geral', doctor: true },
  { name: 'João Pereira', email: 'joao@email.com', role: 'Paciente de 2 médicos', doctor: false },
  { name: 'Pedro Santos', email: 'pedro@email.com', role: 'Paciente · prazo encerrado', doctor: false },
  { name: 'Rafael Costa', email: 'rafael@email.com', role: 'Paciente · conversa nova', doctor: false },
];
const DEMO_PASSWORD = 'demo123';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [resetStep, setResetStep] = useState<'idle' | 'confirm'>('idle');

  const resetDemo = async () => {
    const { resetDemo: reset } = await import('../standalone/server');
    await reset();
    setResetStep('idle');
    toast({ title: 'Dados de demonstração restaurados', tone: 'success' });
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const signIn = async (loginEmail: string, loginPassword: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(loginEmail, loginPassword);
      navigate(homePathFor(user), { replace: true });
    } catch (err) {
      setError((err as ApiError).message);
      setSubmitting(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void signIn(email, password);
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>Entrar</h2>
        <p className="auth-card__subtitle">Acesse sua conta de médico ou paciente.</p>

        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label">E-mail</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Senha</span>
            <span className="input-with-action">
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
            {submitting ? <LoaderCircle size={20} className="spin" /> : 'Entrar'}
          </button>
        </form>

        <div className="auth-card__signup">
          <span>Ainda não tem conta?</span>
          <div className="signup-options">
            <Link to="/cadastro/medico" className="signup-option">
              <Stethoscope size={20} />
              <span>
                <b>Sou médico</b>
                <small>Criar conta profissional</small>
              </span>
              <ChevronRight size={18} />
            </Link>
            <Link to="/cadastro/paciente" className="signup-option">
              <UserRound size={20} />
              <span>
                <b>Sou paciente</b>
                <small>Com o e-mail do cadastro</small>
              </span>
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      <div className="demo-card">
        <div className="demo-card__header">
          <strong>Contas de demonstração</strong>
          <span>
            Clique para entrar · senha <code>{DEMO_PASSWORD}</code>
          </span>
        </div>
        <div className="demo-card__list">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              className="demo-account"
              disabled={submitting}
              onClick={() => {
                setEmail(account.email);
                setPassword(DEMO_PASSWORD);
                void signIn(account.email, DEMO_PASSWORD);
              }}
            >
              <Avatar name={account.name} size={34} />
              <span>
                <b>{account.name}</b>
                <small>{account.role}</small>
              </span>
              {account.doctor ? <Stethoscope size={16} /> : <UserRound size={16} />}
            </button>
          ))}
        </div>
        {STANDALONE && (
          <div className="demo-card__footer">
            <p>
              Versão de demonstração com dados fictícios, salvos apenas neste navegador. Para conversar como médico e
              paciente ao mesmo tempo, abra esta página em outra aba e entre com a outra conta.
            </p>
            {resetStep === 'idle' ? (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setResetStep('confirm')}>
                Restaurar dados de demonstração
              </button>
            ) : (
              <div className="demo-card__confirm">
                <span>Apagar as alterações e voltar ao estado inicial?</span>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => setResetStep('idle')}>
                  Cancelar
                </button>
                <button type="button" className="btn btn--danger btn--small" onClick={() => void resetDemo()}>
                  Restaurar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
