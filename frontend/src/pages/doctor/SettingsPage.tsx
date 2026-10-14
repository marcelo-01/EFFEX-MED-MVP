import { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, CalendarClock, CalendarPlus, LoaderCircle, MessageSquareText, Moon } from 'lucide-react';
import { settingsApi } from '../../api';
import type { ApiError } from '../../api/http';
import type { DayOfWeek, Settings } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import {
  browserNotificationPermission,
  playNotificationSound,
  requestBrowserNotifications,
  showBrowserNotification,
} from '../../utils/alerts';
import { addDays, formatClock, formatDays, pluralDays, toLocalDateValue, formatDate, WEEK_DAYS } from '../../utils/format';

const DURATION_OPTIONS = [7, 15, 30, 60, 90];
const EXTENSION_OPTIONS = [7, 15, 30];

export function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [saved, setSaved] = useState<Settings | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState(browserNotificationPermission());

  useEffect(() => {
    settingsApi
      .get()
      .then((settings) => {
        const normalized = {
          ...settings,
          notificationStart: formatClock(settings.notificationStart),
          notificationEnd: formatClock(settings.notificationEnd),
          welcomeMessage: settings.welcomeMessage ?? '',
        };
        setSaved(normalized);
        setForm(normalized);
      })
      .catch((error: ApiError) => toast({ title: 'Erro ao carregar configurações', description: error.message, tone: 'error' }));
  }, [toast]);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(form), [saved, form]);

  if (!form) {
    return (
      <div className="page">
        <div className="empty-state">
          <LoaderCircle className="spin" /> Carregando configurações…
        </div>
      </div>
    );
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const toggleDay = (day: DayOfWeek) =>
    set(
      'notificationDays',
      form.notificationDays.includes(day)
        ? form.notificationDays.filter((d) => d !== day)
        : WEEK_DAYS.map((d) => d.value).filter((d) => d === day || form.notificationDays.includes(d)),
    );

  const save = async () => {
    setSaving(true);
    try {
      const result = await settingsApi.update(form);
      const normalized = {
        ...result,
        notificationStart: formatClock(result.notificationStart),
        notificationEnd: formatClock(result.notificationEnd),
        welcomeMessage: result.welcomeMessage ?? '',
      };
      setSaved(normalized);
      setForm(normalized);
      toast({ title: 'Configurações salvas', tone: 'success' });
    } catch (error) {
      toast({ title: 'Não foi possível salvar', description: (error as ApiError).message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const enableNotifications = async () => {
    const result = await requestBrowserNotifications();
    setPermission(result);
    if (result === 'granted') toast({ title: 'Notificações do navegador ativadas', tone: 'success' });
  };

  const testNotification = () => {
    playNotificationSound();
    toast({ title: 'Teste de notificação', description: 'É assim que você será avisado de novas mensagens.', tone: 'message' });
    showBrowserNotification('Effex Med', 'Teste de notificação: tudo certo por aqui!');
  };

  const returnDate = formatDate(toLocalDateValue(addDays(new Date(), form.defaultConversationDays || 0)));

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <h1>Configurações</h1>
          <p>Defina como você atende seus pacientes pelo aplicativo.</p>
        </div>
      </header>

      <section className="card settings-card">
        <SectionTitle icon={<Bell size={20} />} title="Horário para receber notificações" description="Fora deste horário as mensagens chegam normalmente, mas sem alertas." />
        <div className="field">
          <span className="field__label">Dias da semana</span>
          <div className="weekday-picker">
            {WEEK_DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                aria-pressed={form.notificationDays.includes(day.value)}
                className={`weekday ${form.notificationDays.includes(day.value) ? 'weekday--active' : ''}`}
                onClick={() => toggleDay(day.value)}
              >
                {day.short}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row form-row--times">
          <label className="field">
            <span className="field__label">Das</span>
            <input className="input" type="time" value={form.notificationStart} onChange={(e) => set('notificationStart', e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Até</span>
            <input className="input" type="time" value={form.notificationEnd} onChange={(e) => set('notificationEnd', e.target.value)} />
          </label>
        </div>
        <div className="summary-box">
          <Moon size={18} />
          <span>
            Você será notificado <b>{formatDays(form.notificationDays)}</b>, das <b>{form.notificationStart}</b> às{' '}
            <b>{form.notificationEnd}</b>. Mensagens recebidas fora desse horário ficam marcadas com{' '}
            <span className="inline-tag"><Moon size={11} /> fora do horário</span> e o paciente vê que você está fora do horário de atendimento.
          </span>
        </div>
        <div className="browser-notifications">
          <BellRing size={18} />
          <span>
            <b>Notificações do navegador</b>
            <small>
              {permission === 'granted'
                ? 'Ativadas neste navegador.'
                : permission === 'denied'
                  ? 'Bloqueadas. Libere nas configurações do navegador.'
                  : permission === 'unsupported'
                    ? 'Não suportadas neste navegador.'
                    : 'Receba alertas mesmo com a aba em segundo plano.'}
            </small>
          </span>
          {permission === 'default' && (
            <button type="button" className="btn btn--soft btn--small" onClick={enableNotifications}>
              Ativar
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--small" onClick={testNotification}>
            Testar
          </button>
        </div>
      </section>

      <section className="card settings-card">
        <SectionTitle icon={<CalendarClock size={20} />} title="Prazo de duração da conversa" description="O chat fica disponível até o retorno. Depois disso, o paciente não consegue enviar mensagens." />
        <div className="field">
          <span className="field__label">Prazo padrão a partir do cadastro do paciente</span>
          <div className="chip-row">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`chip chip--lg ${form.defaultConversationDays === option ? 'chip--active' : ''}`}
                onClick={() => set('defaultConversationDays', option)}
              >
                {pluralDays(option)}
              </button>
            ))}
            <label className="input-suffix">
              <input
                type="number"
                min={1}
                max={365}
                value={form.defaultConversationDays || ''}
                onChange={(e) => set('defaultConversationDays', Number(e.target.value))}
                aria-label="Prazo padrão em dias"
              />
              <span>dias</span>
            </label>
          </div>
          <span className="field__hint">
            Um paciente cadastrado hoje poderá enviar mensagens até <b>{returnDate}</b>. Você pode ajustar a data de cada paciente no cadastro.
          </span>
        </div>
      </section>

      <section className="card settings-card">
        <SectionTitle icon={<CalendarPlus size={20} />} title="Extensão do prazo" description="Estenda a conversa após o retorno — por exemplo, quando o paciente contratar um acompanhamento extra." />
        <label className="toggle-row">
          <span>
            <b>Permitir que o paciente solicite extensão pelo aplicativo</b>
            <small>Quando o prazo terminar, o paciente verá um botão “Solicitar extensão”.</small>
          </span>
          <Toggle checked={form.allowExtensionRequests} onChange={(value) => set('allowExtensionRequests', value)} />
        </label>
        <div className="field">
          <span className="field__label">Extensão sugerida</span>
          <div className="chip-row">
            {EXTENSION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`chip chip--lg ${form.defaultExtensionDays === option ? 'chip--active' : ''}`}
                onClick={() => set('defaultExtensionDays', option)}
              >
                {pluralDays(option)}
              </button>
            ))}
            <label className="input-suffix">
              <input
                type="number"
                min={1}
                max={365}
                value={form.defaultExtensionDays || ''}
                onChange={(e) => set('defaultExtensionDays', Number(e.target.value))}
                aria-label="Extensão sugerida em dias"
              />
              <span>dias</span>
            </label>
          </div>
          <span className="field__hint">Para estender, use o botão “Estender” na aba Pacientes ou no topo do chat.</span>
        </div>
      </section>

      <section className="card settings-card">
        <SectionTitle icon={<MessageSquareText size={20} />} title="Mensagem padrão" description="Enviada automaticamente quando o paciente inicia uma conversa com você." />
        <label className="toggle-row">
          <span>
            <b>Enviar mensagem automática</b>
            <small>O paciente recebe a mensagem logo após o primeiro contato.</small>
          </span>
          <Toggle checked={form.welcomeMessageEnabled} onChange={(value) => set('welcomeMessageEnabled', value)} />
        </label>
        <div className="welcome-editor">
          <label className="field">
            <span className="field__label">Texto da mensagem</span>
            <textarea
              className="input textarea"
              rows={5}
              maxLength={1000}
              disabled={!form.welcomeMessageEnabled}
              value={form.welcomeMessage ?? ''}
              onChange={(e) => set('welcomeMessage', e.target.value)}
              placeholder="Ex.: Olá! Recebi sua mensagem e responderei em breve."
            />
            <span className="field__hint align-right">{(form.welcomeMessage ?? '').length}/1000</span>
          </label>
          <div className="welcome-preview">
            <span className="field__label">Como o paciente verá</span>
            <div className="welcome-preview__chat">
              <div className="bubble-row bubble-row--out bubble-row--first">
                <div className="bubble bubble--out bubble--tail">
                  <p className="bubble__text">Olá, doutor(a)! Tenho uma dúvida sobre a receita.</p>
                  <span className="bubble__meta">10:30</span>
                </div>
              </div>
              {form.welcomeMessageEnabled && form.welcomeMessage?.trim() ? (
                <div className="bubble-row bubble-row--in bubble-row--first">
                  <div className="bubble bubble--in bubble--tail bubble--auto">
                    <div className="bubble__label">
                      <MessageSquareText size={13} /> Mensagem automática · {user?.name}
                    </div>
                    <p className="bubble__text">{form.welcomeMessage}</p>
                    <span className="bubble__meta">10:30</span>
                  </div>
                </div>
              ) : (
                <div className="system-message">
                  <span>Nenhuma mensagem automática será enviada.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className={`save-bar ${dirty ? 'save-bar--visible' : ''}`}>
        <span>Você tem alterações não salvas.</span>
        <button type="button" className="btn btn--ghost" onClick={() => setForm(saved)} disabled={saving}>
          Descartar
        </button>
        <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </div>
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <span className={`toggle ${checked ? 'toggle--on' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle__thumb" />
    </span>
  );
}
