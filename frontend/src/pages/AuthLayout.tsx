import type { ReactNode } from 'react';
import { BellRing, CalendarClock, MessagesSquare, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/Logo';

const FEATURES = [
  { icon: MessagesSquare, title: 'Comunicação centralizada', text: 'Todas as conversas com pacientes em um só lugar, fora do WhatsApp pessoal.' },
  { icon: CalendarClock, title: 'Chat até o retorno', text: 'Cada conversa tem prazo. Depois do retorno, só com extensão.' },
  { icon: BellRing, title: 'Notificações no seu horário', text: 'Você define quando quer ser avisado. O resto espera.' },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero__pattern" aria-hidden="true" />
        <Logo size={44} light />
        <div className="auth-hero__content">
          <h1>
            Seus pacientes organizados.
            <br />
            Sua rotina protegida.
          </h1>
          <p>O canal oficial entre médico e paciente, com controle de prazos e horários.</p>
          <ul className="auth-hero__features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="auth-hero__icon">
                  <Icon size={20} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-hero__footer">
          <ShieldCheck size={16} /> Dados de saúde tratados com sigilo
        </p>
      </section>
      <section className="auth-content">
        <div className="auth-content__logo">
          <Logo size={40} />
        </div>
        {children}
      </section>
    </div>
  );
}
