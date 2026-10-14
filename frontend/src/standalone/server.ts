/**
 * Backend simulado para o modo standalone.
 *
 * Reproduz no navegador a mesma API REST e as mesmas regras de negócio do backend Spring Boot
 * (ver backend/src/main/java/com/effexmed), para que o frontend rode como página estática.
 * Os dados ficam no localStorage e os eventos em tempo real são distribuídos entre as abas
 * abertas via BroadcastChannel — assim é possível abrir o médico numa aba e o paciente em outra.
 */
import { ApiError } from '../api/http';
import type {
  ChatEvent,
  Conversation,
  ConversationStatus,
  DayOfWeek,
  Extension,
  Message,
  MessageType,
  Patient,
  Role,
  Settings,
  User,
} from '../api/types';

// ---------------------------------------------------------------------------
// Modelo persistido
// ---------------------------------------------------------------------------

interface DbUser extends User {
  passwordHash: string;
  createdAt: string;
}

interface DbSettings extends Settings {
  doctorId: number;
}

interface DbConversation {
  id: number;
  doctorId: number;
  patientId: number | null;
  patientEmail: string;
  patientName: string | null;
  expiresOn: string;
  createdAt: string;
  lastMessageAt: string | null;
  extensionRequestedAt: string | null;
}

interface DbExtension extends Extension {
  conversationId: number;
}

/** Aceites do cadastro (LGPD), como a tabela user_consents do backend. */
interface DbConsent {
  userId: number;
  type: 'TERMS_OF_USE' | 'PRIVACY_POLICY' | 'HEALTH_DATA' | 'PROFESSIONAL_DECLARATION' | 'MARKETING';
  documentVersion: string;
  grantedAt: string;
}

interface Db {
  version: 1;
  /** Incrementa a cada gravação; a aba usa sempre a cópia mais recente (storage ou memória). */
  revision: number;
  seq: number;
  users: DbUser[];
  settings: DbSettings[];
  conversations: DbConversation[];
  messages: Message[];
  extensions: DbExtension[];
  consents: DbConsent[];
  sessions: Record<string, number>;
}

const STORAGE_KEY = 'effexmed.demo.v1';
const CHANNEL_NAME = 'effexmed.demo';
export const DEMO_PASSWORD = 'demo123';
const EXPIRING_SOON_DAYS = 3;
/** Prazo usado quando o médico cadastra o paciente sem informar a data do retorno. */
const DEFAULT_DURATION_DAYS = 30;
const DOCUMENTS_VERSION = '1.0';
const MAX_MESSAGE = 2000;
const WEEK: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const WEEKDAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_ORDER: DayOfWeek[] = [...WEEKDAYS, 'SATURDAY', 'SUNDAY'];

let memoryDb: Db | null = null;

function readStorage(): Db | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Db) : null;
  } catch {
    return null;
  }
}

const revisionOf = (db: Db | null) => db?.revision ?? -1;

/**
 * O localStorage é sincronizado entre abas de forma assíncrona; por isso cada gravação também
 * envia o banco pelo BroadcastChannel, e a aba usa a cópia com a maior revisão.
 */
function freshestDb(): Db | null {
  const stored = readStorage();
  return revisionOf(stored) >= revisionOf(memoryDb) ? (stored ?? memoryDb) : memoryDb;
}

function writeStorage(db: Db) {
  db.revision = revisionOf(db) + 1;
  memoryDb = structuredClone(db);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* sem armazenamento: os dados ficam só na memória desta aba */
  }
  try {
    channel?.postMessage({ kind: 'db', db: memoryDb } satisfies ChannelMessage);
  } catch {
    /* canal indisponível */
  }
}

let seeding: Promise<Db> | null = null;

/** Carrega a cópia mais recente do banco (inclui o que outras abas gravaram). */
async function loadDb(): Promise<Db> {
  const stored = freshestDb();
  if (stored) return structuredClone(stored);
  seeding ??= createSeed().then((db) => {
    writeStorage(db);
    seeding = null;
    return db;
  });
  return seeding;
}

// ---------------------------------------------------------------------------
// Eventos em tempo real
// ---------------------------------------------------------------------------

interface BusMessage {
  recipientId: number;
  event: ChatEvent;
}

type ChannelMessage = { kind: 'db'; db: Db } | { kind: 'event'; message: BusMessage };

type BusListener = (message: BusMessage) => void;
const busListeners = new Set<BusListener>();
let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = ({ data }: MessageEvent<ChannelMessage>) => {
    if (data.kind === 'db') {
      if (data.db.revision > revisionOf(memoryDb)) memoryDb = data.db;
    } else {
      busListeners.forEach((l) => l(data.message));
    }
  };
} catch {
  channel = null;
}

/** Eventos ficam na fila até o fim da requisição — como o backend, que só publica após o commit. */
let outbox: BusMessage[] = [];

function publish(recipientId: number | null, event: ChatEvent) {
  if (recipientId !== null) outbox.push({ recipientId, event });
}

function flushOutbox() {
  const messages = outbox;
  outbox = [];
  for (const message of messages) {
    setTimeout(() => busListeners.forEach((l) => l(message)), 0);
    try {
      channel?.postMessage({ kind: 'event', message } satisfies ChannelMessage);
    } catch {
      /* canal indisponível */
    }
  }
}

/** Equivalente à assinatura de /user/queue/events no STOMP. */
export function connect(token: string, onEvent: (event: ChatEvent) => void): () => void {
  const listener: BusListener = (message) => {
    const userId = freshestDb()?.sessions[token];
    if (userId !== undefined && message.recipientId === userId) onEvent(message.event);
  };
  busListeners.add(listener);
  return () => busListeners.delete(listener);
}

export async function typing(token: string, conversationId: number) {
  const db = await loadDb();
  const user = currentUser(db, token);
  const conversation = loadForParticipant(db, user, conversationId);
  publish(counterpartId(conversation, user.id), {
    type: 'TYPING',
    conversationId,
    data: { userId: user.id },
    alert: false,
  });
  flushOutbox();
}

/** Apaga tudo e recria os dados de demonstração. */
export async function resetDemo() {
  const db = await createSeed();
  writeStorage(db);
}

// ---------------------------------------------------------------------------
// Utilitários de data
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

function localDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function today() {
  return localDate(new Date());
}

function parseDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function plusDays(value: string, days: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function daysBetween(from: string, to: string) {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

function formatBr(value: string) {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDate(value).getTime());
}

function toMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** Mesma regra de DoctorSettings.isWithinNotificationWindow no backend. */
function isWithinWindow(settings: DbSettings, moment: Date) {
  if (!settings.notificationDays.includes(WEEK[moment.getDay()])) return false;
  const time = moment.getHours() * 60 + moment.getMinutes();
  const start = toMinutes(settings.notificationStart);
  const end = toMinutes(settings.notificationEnd);
  if (start === end) return true;
  if (start < end) return time >= start && time < end;
  return time >= start || time < end;
}

// ---------------------------------------------------------------------------
// Regras compartilhadas
// ---------------------------------------------------------------------------

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function hashPassword(password: string) {
  try {
    const bytes = new TextEncoder().encode(`effexmed:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let hash = 0;
    for (const char of `effexmed:${password}`) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
    return `weak-${hash}`;
  }
}

function newToken() {
  try {
    return `demo.${crypto.randomUUID()}`;
  } catch {
    return `demo.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  }
}

const nextId = (db: Db) => ++db.seq;

function statusOf(conversation: DbConversation, day: string): ConversationStatus {
  const remaining = daysBetween(day, conversation.expiresOn);
  if (remaining < 0) return 'EXPIRED';
  return remaining <= EXPIRING_SOON_DAYS ? 'EXPIRING_SOON' : 'ACTIVE';
}

const isExpired = (conversation: DbConversation, day: string) => daysBetween(day, conversation.expiresOn) < 0;

function counterpartId(conversation: DbConversation, userId: number) {
  return conversation.doctorId === userId ? conversation.patientId : conversation.doctorId;
}

function hasParticipant(conversation: DbConversation, userId: number) {
  return conversation.doctorId === userId || conversation.patientId === userId;
}

function userById(db: Db, id: number | null) {
  return db.users.find((u) => u.id === id) ?? null;
}

function settingsFor(db: Db, doctorId: number) {
  const settings = db.settings.find((s) => s.doctorId === doctorId);
  if (!settings) throw new ApiError(404, 'Configurações do médico não encontradas.');
  return settings;
}

function patientDisplayName(db: Db, conversation: DbConversation) {
  return userById(db, conversation.patientId)?.name ?? conversation.patientName ?? conversation.patientEmail;
}

function currentUser(db: Db, token: string | null) {
  const userId = token ? db.sessions[token] : undefined;
  const user = userId !== undefined ? userById(db, userId) : null;
  if (!user) throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  return user;
}

function requireDoctor(user: DbUser) {
  if (user.role !== 'DOCTOR') throw new ApiError(403, 'Você não tem permissão para esta ação.');
}

function loadForParticipant(db: Db, user: DbUser, conversationId: number) {
  const conversation = db.conversations.find((c) => c.id === conversationId);
  if (!conversation || !hasParticipant(conversation, user.id)) {
    throw new ApiError(404, 'Conversa não encontrada.');
  }
  return conversation;
}

function loadOwned(db: Db, doctorId: number, conversationId: number) {
  const conversation = db.conversations.find((c) => c.id === conversationId && c.doctorId === doctorId);
  if (!conversation) throw new ApiError(404, 'Paciente não encontrado.');
  return conversation;
}

function toUserDto(user: DbUser): User {
  const { id, name, email, role, crm, specialty } = user;
  return { id, name, email, role, crm, specialty };
}

function addMessage(
  db: Db,
  conversation: DbConversation,
  senderId: number | null,
  type: MessageType,
  content: string,
  sentAt: string,
  outsideBusinessHours = false,
): Message {
  const sender = userById(db, senderId);
  const message: Message = {
    id: nextId(db),
    conversationId: conversation.id,
    senderId,
    senderName: sender?.name ?? null,
    type,
    content,
    sentAt,
    readAt: null,
    outsideBusinessHours,
  };
  db.messages.push(message);
  if (!conversation.lastMessageAt || sentAt > conversation.lastMessageAt) conversation.lastMessageAt = sentAt;
  return message;
}

function publishMessage(conversation: DbConversation, message: Message, alertDoctor: boolean, alertPatient: boolean) {
  publish(conversation.doctorId, {
    type: 'MESSAGE_CREATED',
    conversationId: conversation.id,
    data: message,
    alert: alertDoctor,
  });
  publish(conversation.patientId, {
    type: 'MESSAGE_CREATED',
    conversationId: conversation.id,
    data: message,
    alert: alertPatient,
  });
}

function publishConversationUpdated(conversation: DbConversation) {
  const event: ChatEvent = { type: 'CONVERSATION_UPDATED', conversationId: conversation.id, data: null, alert: false };
  publish(conversation.doctorId, event);
  publish(conversation.patientId, event);
}

function postSystemMessage(db: Db, conversation: DbConversation, content: string) {
  const message = addMessage(db, conversation, null, 'SYSTEM', content, new Date().toISOString());
  publishMessage(conversation, message, false, true);
}

function unreadCount(db: Db, conversationId: number, userId: number) {
  return db.messages.filter(
    (m) => m.conversationId === conversationId && m.readAt === null && m.senderId !== null && m.senderId !== userId,
  ).length;
}

function lastMessage(db: Db, conversationId: number) {
  let last: Message | null = null;
  for (const message of db.messages) {
    if (message.conversationId === conversationId && (!last || message.id > last.id)) last = message;
  }
  return last;
}

const lastActivity = (c: DbConversation) => c.lastMessageAt ?? c.createdAt;

function toConversationDto(db: Db, conversation: DbConversation, viewer: DbUser): Conversation {
  const day = today();
  const settings = settingsFor(db, conversation.doctorId);
  const doctor = userById(db, conversation.doctorId)!;
  const isDoctor = viewer.role === 'DOCTOR';
  const counterpart = isDoctor
    ? {
        id: conversation.patientId,
        name: patientDisplayName(db, conversation),
        email: conversation.patientEmail,
        detail: conversation.patientEmail,
      }
    : {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        detail: doctor.specialty ? `${doctor.specialty} · CRM ${doctor.crm}` : `CRM ${doctor.crm}`,
      };
  return {
    id: conversation.id,
    counterpart,
    expiresOn: conversation.expiresOn,
    daysRemaining: daysBetween(day, conversation.expiresOn),
    status: statusOf(conversation, day),
    canSend: isDoctor ? conversation.patientId !== null : !isExpired(conversation, day),
    extensionRequested: conversation.extensionRequestedAt !== null,
    lastMessage: lastMessage(db, conversation.id),
    unreadCount: unreadCount(db, conversation.id, viewer.id),
    doctorAvailability: {
      days: DAY_ORDER.filter((d) => settings.notificationDays.includes(d)),
      start: settings.notificationStart,
      end: settings.notificationEnd,
      availableNow: isWithinWindow(settings, new Date()),
    },
  };
}

function toPatientDto(db: Db, conversation: DbConversation): Patient {
  const day = today();
  const hasHistory = db.messages.some(
    (m) => m.conversationId === conversation.id && (m.type === 'TEXT' || m.type === 'AUTO_REPLY'),
  );
  return {
    conversationId: conversation.id,
    name: patientDisplayName(db, conversation),
    email: conversation.patientEmail,
    registered: conversation.patientId !== null,
    expiresOn: conversation.expiresOn,
    daysRemaining: daysBetween(day, conversation.expiresOn),
    status: statusOf(conversation, day),
    createdAt: conversation.createdAt,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: unreadCount(db, conversation.id, conversation.doctorId),
    extensionRequested: conversation.extensionRequestedAt !== null,
    extensionCount: db.extensions.filter((e) => e.conversationId === conversation.id).length,
    removable: !hasHistory,
  };
}

// ---------------------------------------------------------------------------
// Validação (mesmas mensagens do backend)
// ---------------------------------------------------------------------------

type Body = Record<string, unknown>;

class Validator {
  readonly errors: Record<string, string> = {};

  text(body: Body, field: string, { required, max, min, email }: { required?: string; max?: number; min?: number; email?: boolean }, messages: { max?: string; min?: string; email?: string }) {
    const raw = body[field];
    const value = typeof raw === 'string' ? raw : '';
    if (required && !value.trim()) return this.fail(field, required);
    if (!value) return;
    if (email && !EMAIL_PATTERN.test(value.trim())) return this.fail(field, messages.email ?? 'Informe um e-mail válido.');
    if (min !== undefined && value.length < min) return this.fail(field, messages.min!);
    if (max !== undefined && value.length > max) return this.fail(field, messages.max!);
  }

  range(body: Body, field: string, min: number, max: number, minMessage: string, maxMessage: string) {
    const value = Number(body[field]);
    if (!Number.isFinite(value) || value < min) return this.fail(field, minMessage);
    if (value > max) this.fail(field, maxMessage);
  }

  fail(field: string, message: string) {
    this.errors[field] ??= message;
  }

  check() {
    const messages = Object.values(this.errors);
    if (messages.length > 0) throw new ApiError(400, messages[0], this.errors);
  }
}

const str = (body: Body, field: string) => (typeof body[field] === 'string' ? (body[field] as string).trim() : '');
const optional = (body: Body, field: string) => str(body, field) || null;

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

async function register(db: Db, body: Body, role: Role) {
  const v = new Validator();
  v.text(body, 'name', { required: 'Informe o nome.', max: 120 }, { max: 'O nome pode ter no máximo 120 caracteres.' });
  v.text(body, 'email', { required: 'Informe o e-mail.', email: true, max: 160 }, { max: 'O e-mail pode ter no máximo 160 caracteres.' });
  v.text(body, 'password', { required: 'Informe a senha.', min: 6, max: 72 }, {
    min: 'A senha deve ter entre 6 e 72 caracteres.',
    max: 'A senha deve ter entre 6 e 72 caracteres.',
  });
  if (role === 'DOCTOR') {
    v.text(body, 'crm', { required: 'Informe o CRM.', max: 30 }, { max: 'O CRM pode ter no máximo 30 caracteres.' });
    v.text(body, 'specialty', { max: 80 }, { max: 'A especialidade pode ter no máximo 80 caracteres.' });
  }
  if (body.acceptTerms !== true) v.fail('acceptTerms', 'Aceite os Termos de Uso para continuar.');
  if (body.acceptPrivacyPolicy !== true) v.fail('acceptPrivacyPolicy', 'Aceite a Política de Privacidade para continuar.');
  if (role === 'DOCTOR' && body.professionalDeclaration !== true) {
    v.fail('professionalDeclaration', 'Confirme a declaração profissional para continuar.');
  }
  if (role === 'PATIENT' && body.consentHealthData !== true) {
    v.fail('consentHealthData', 'Autorize o uso dos dados de saúde para conversar com seus médicos.');
  }
  v.check();

  const email = normalizeEmail(str(body, 'email'));
  if (db.users.some((u) => u.email === email)) throw new ApiError(409, 'Já existe uma conta com este e-mail.');

  const user: DbUser = {
    id: nextId(db),
    name: str(body, 'name'),
    email,
    role,
    crm: role === 'DOCTOR' ? str(body, 'crm') : null,
    specialty: role === 'DOCTOR' ? optional(body, 'specialty') : null,
    passwordHash: await hashPassword(String(body.password)),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  recordConsents(db, user, body.marketingOptIn === true);

  if (role === 'DOCTOR') {
    db.settings.push(defaultSettings(user.id));
  } else {
    // Vincula as conversas em que algum médico já cadastrou este e-mail.
    for (const conversation of db.conversations) {
      if (conversation.patientEmail === email && conversation.patientId === null) {
        conversation.patientId = user.id;
        publishConversationUpdated(conversation);
      }
    }
  }
  return authenticated(db, user);
}

function recordConsents(db: Db, user: DbUser, marketingOptIn: boolean) {
  const types: DbConsent['type'][] = [
    'TERMS_OF_USE',
    'PRIVACY_POLICY',
    user.role === 'DOCTOR' ? 'PROFESSIONAL_DECLARATION' : 'HEALTH_DATA',
  ];
  if (marketingOptIn) types.push('MARKETING');
  db.consents ??= [];
  for (const type of types) {
    db.consents.push({ userId: user.id, type, documentVersion: DOCUMENTS_VERSION, grantedAt: user.createdAt });
  }
}

function authenticated(db: Db, user: DbUser) {
  const token = newToken();
  db.sessions[token] = user.id;
  return { token, user: toUserDto(user) };
}

async function login(db: Db, body: Body) {
  const v = new Validator();
  v.text(body, 'email', { required: 'Informe o e-mail.' }, {});
  v.text(body, 'password', { required: 'Informe a senha.' }, {});
  v.check();
  const user = db.users.find((u) => u.email === normalizeEmail(str(body, 'email')));
  if (!user || user.passwordHash !== (await hashPassword(String(body.password)))) {
    throw new ApiError(401, 'E-mail ou senha inválidos.');
  }
  return authenticated(db, user);
}

function updateSettings(db: Db, doctorId: number, body: Body): Settings {
  const v = new Validator();
  const days = Array.isArray(body.notificationDays)
    ? (body.notificationDays as string[]).filter((d): d is DayOfWeek => DAY_ORDER.includes(d as DayOfWeek))
    : [];
  if (days.length === 0) v.fail('notificationDays', 'Selecione ao menos um dia para receber notificações.');
  const time = /^\d{2}:\d{2}/;
  if (!time.test(str(body, 'notificationStart'))) v.fail('notificationStart', 'Informe o horário inicial das notificações.');
  if (!time.test(str(body, 'notificationEnd'))) v.fail('notificationEnd', 'Informe o horário final das notificações.');
  v.text(body, 'welcomeMessage', { max: 1000 }, { max: 'A mensagem padrão pode ter no máximo 1000 caracteres.' });
  v.check();

  const settings = settingsFor(db, doctorId);
  Object.assign(settings, {
    notificationDays: DAY_ORDER.filter((d) => days.includes(d)),
    notificationStart: str(body, 'notificationStart').slice(0, 5),
    notificationEnd: str(body, 'notificationEnd').slice(0, 5),
    welcomeMessageEnabled: Boolean(body.welcomeMessageEnabled),
    welcomeMessage: optional(body, 'welcomeMessage'),
  });
  return toSettingsDto(settings);
}

function toSettingsDto(settings: DbSettings): Settings {
  const { doctorId: _doctorId, ...dto } = settings;
  return dto;
}

function requireNotInPast(expiresOn: string) {
  if (daysBetween(today(), expiresOn) < 0) throw new ApiError(400, 'A data de retorno não pode estar no passado.');
}

function registerPatient(db: Db, doctor: DbUser, body: Body): Patient {
  const v = new Validator();
  v.text(body, 'email', { required: 'Informe o e-mail do paciente.', email: true, max: 160 }, { max: 'O e-mail pode ter no máximo 160 caracteres.' });
  v.text(body, 'name', { max: 120 }, { max: 'O nome pode ter no máximo 120 caracteres.' });
  v.check();

  const email = normalizeEmail(str(body, 'email'));
  if (email === doctor.email) throw new ApiError(400, 'Você não pode cadastrar o seu próprio e-mail como paciente.');
  if (db.conversations.some((c) => c.doctorId === doctor.id && c.patientEmail === email)) {
    throw new ApiError(409, 'Este paciente já está cadastrado.');
  }
  const account = db.users.find((u) => u.email === email) ?? null;
  if (account?.role === 'DOCTOR') throw new ApiError(409, 'Este e-mail pertence a uma conta de médico.');

  const expiresOn = isValidDate(body.expiresOn)
    ? body.expiresOn
    : plusDays(today(), DEFAULT_DURATION_DAYS);
  requireNotInPast(expiresOn);

  const conversation: DbConversation = {
    id: nextId(db),
    doctorId: doctor.id,
    patientId: account?.id ?? null,
    patientEmail: email,
    patientName: optional(body, 'name'),
    expiresOn,
    createdAt: new Date().toISOString(),
    lastMessageAt: null,
    extensionRequestedAt: null,
  };
  db.conversations.push(conversation);
  if (account) publishConversationUpdated(conversation);
  return toPatientDto(db, conversation);
}

function updatePatient(db: Db, doctor: DbUser, conversationId: number, body: Body): Patient {
  const v = new Validator();
  v.text(body, 'name', { max: 120 }, { max: 'O nome pode ter no máximo 120 caracteres.' });
  v.check();
  const conversation = loadOwned(db, doctor.id, conversationId);
  conversation.patientName = optional(body, 'name');
  if (isValidDate(body.expiresOn) && body.expiresOn !== conversation.expiresOn) {
    requireNotInPast(body.expiresOn);
    conversation.expiresOn = body.expiresOn;
    conversation.extensionRequestedAt = null;
    postSystemMessage(db, conversation, `Data de retorno atualizada. A conversa fica disponível até ${formatBr(body.expiresOn)}.`);
  }
  publishConversationUpdated(conversation);
  return toPatientDto(db, conversation);
}

function extend(db: Db, doctor: DbUser, conversationId: number, body: Body): Patient {
  const v = new Validator();
  v.range(body, 'days', 1, 365, 'A extensão deve ser de pelo menos 1 dia.', 'A extensão pode ser de no máximo 365 dias.');
  v.text(body, 'note', { max: 255 }, { max: 'A observação pode ter no máximo 255 caracteres.' });
  v.check();

  const conversation = loadOwned(db, doctor.id, conversationId);
  const days = Math.trunc(Number(body.days));
  const day = today();
  const previous = conversation.expiresOn;
  const base = isExpired(conversation, day) ? day : previous;
  conversation.expiresOn = plusDays(base, days);
  conversation.extensionRequestedAt = null;
  db.extensions.push({
    id: nextId(db),
    conversationId: conversation.id,
    days,
    previousExpiresOn: previous,
    newExpiresOn: conversation.expiresOn,
    note: optional(body, 'note'),
    createdAt: new Date().toISOString(),
  });
  postSystemMessage(
    db,
    conversation,
    `Prazo da conversa estendido por ${days} ${days === 1 ? 'dia' : 'dias'}. Disponível até ${formatBr(conversation.expiresOn)}.`,
  );
  publishConversationUpdated(conversation);
  return toPatientDto(db, conversation);
}

function removePatient(db: Db, doctor: DbUser, conversationId: number) {
  const conversation = loadOwned(db, doctor.id, conversationId);
  if (db.messages.some((m) => m.conversationId === conversation.id && (m.type === 'TEXT' || m.type === 'AUTO_REPLY'))) {
    throw new ApiError(409, 'Não é possível remover um paciente que já possui histórico de conversa.');
  }
  db.messages = db.messages.filter((m) => m.conversationId !== conversation.id);
  db.extensions = db.extensions.filter((e) => e.conversationId !== conversation.id);
  db.conversations = db.conversations.filter((c) => c.id !== conversation.id);
  publishConversationUpdated(conversation);
}

function listConversations(db: Db, user: DbUser) {
  const list = db.conversations.filter((c) =>
    user.role === 'DOCTOR' ? c.doctorId === user.id && c.patientId !== null : c.patientId === user.id,
  );
  return list
    .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)))
    .map((c) => toConversationDto(db, c, user));
}

function sendMessage(db: Db, user: DbUser, conversationId: number, body: Body): Message {
  const v = new Validator();
  v.text(body, 'content', { required: 'A mensagem não pode estar vazia.', max: MAX_MESSAGE }, {
    max: 'A mensagem pode ter no máximo 2000 caracteres.',
  });
  v.check();

  const conversation = loadForParticipant(db, user, conversationId);
  const settings = settingsFor(db, conversation.doctorId);
  const now = new Date();
  const sentAt = now.toISOString();
  const content = str(body, 'content');

  if (user.role === 'DOCTOR') {
    if (conversation.patientId === null) throw new ApiError(409, 'O paciente ainda não criou a conta no aplicativo.');
    const message = addMessage(db, conversation, user.id, 'TEXT', content, sentAt);
    publishMessage(conversation, message, false, true);
    return message;
  }

  if (isExpired(conversation, localDate(now))) {
    throw new ApiError(
      403,
      `O prazo desta conversa terminou em ${formatBr(conversation.expiresOn)}. Solicite a extensão do prazo ao seu médico para continuar.`,
    );
  }
  const withinWindow = isWithinWindow(settings, now);
  const startingConversation = !db.messages.some(
    (m) => m.conversationId === conversation.id && (m.type === 'TEXT' || m.type === 'AUTO_REPLY'),
  );
  const message = addMessage(db, conversation, user.id, 'TEXT', content, sentAt, !withinWindow);
  publishMessage(conversation, message, withinWindow, false);
  if (startingConversation && settings.welcomeMessageEnabled && settings.welcomeMessage?.trim()) {
    const autoReply = addMessage(db, conversation, conversation.doctorId, 'AUTO_REPLY', settings.welcomeMessage, sentAt);
    publishMessage(conversation, autoReply, false, true);
  }
  return message;
}

function markAsRead(db: Db, user: DbUser, conversationId: number) {
  const conversation = loadForParticipant(db, user, conversationId);
  const readAt = new Date().toISOString();
  let updated = 0;
  for (const message of db.messages) {
    if (
      message.conversationId === conversation.id &&
      message.readAt === null &&
      message.senderId !== null &&
      message.senderId !== user.id
    ) {
      message.readAt = readAt;
      updated++;
    }
  }
  if (updated > 0) {
    publish(counterpartId(conversation, user.id), {
      type: 'MESSAGES_READ',
      conversationId: conversation.id,
      data: { readerId: user.id, readAt },
      alert: false,
    });
  }
  return updated > 0;
}

function requestExtension(db: Db, user: DbUser, conversationId: number): Conversation {
  if (user.role === 'DOCTOR') throw new ApiError(403, 'Apenas o paciente pode solicitar extensão do prazo.');
  const conversation = loadForParticipant(db, user, conversationId);
  const settings = settingsFor(db, conversation.doctorId);
  if (!isExpired(conversation, today())) throw new ApiError(409, 'A conversa ainda está dentro do prazo.');
  if (conversation.extensionRequestedAt === null) {
    const now = new Date();
    conversation.extensionRequestedAt = now.toISOString();
    const message = addMessage(db, conversation, null, 'SYSTEM', 'Solicitação de extensão do prazo enviada ao médico.', now.toISOString());
    publishMessage(conversation, message, isWithinWindow(settings, now), false);
    publishConversationUpdated(conversation);
  }
  return toConversationDto(db, conversation, user);
}

/** Ponto de entrada usado por api/http.ts no modo standalone. */
export async function handleRequest<T>(method: string, path: string, body: unknown, token: string | null): Promise<T> {
  outbox = [];
  try {
    const result = await route<T>(method, path, body, token);
    flushOutbox();
    return result;
  } finally {
    outbox = [];
  }
}

async function route<T>(method: string, path: string, body: unknown, token: string | null): Promise<T> {
  const db = await loadDb();
  const data = (body ?? {}) as Body;
  const route = `${method} ${path}`;
  let match: RegExpMatchArray | null;
  let mutated = true;
  let result: unknown;

  if (route === 'POST /auth/login') result = await login(db, data);
  else if (route === 'POST /auth/register/doctor') result = await register(db, data, 'DOCTOR');
  else if (route === 'POST /auth/register/patient') result = await register(db, data, 'PATIENT');
  else {
    const user = currentUser(db, token);
    if (route === 'GET /auth/me') {
      result = toUserDto(user);
      mutated = false;
    } else if (path.startsWith('/doctor/')) {
      requireDoctor(user);
      if (route === 'GET /doctor/settings') {
        result = toSettingsDto(settingsFor(db, user.id));
        mutated = false;
      } else if (route === 'PUT /doctor/settings') result = updateSettings(db, user.id, data);
      else if (route === 'GET /doctor/patients') {
        result = db.conversations
          .filter((c) => c.doctorId === user.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((c) => toPatientDto(db, c));
        mutated = false;
      } else if (route === 'POST /doctor/patients') result = registerPatient(db, user, data);
      else if ((match = route.match(/^PATCH \/doctor\/patients\/(\d+)$/))) result = updatePatient(db, user, Number(match[1]), data);
      else if ((match = route.match(/^DELETE \/doctor\/patients\/(\d+)$/))) result = removePatient(db, user, Number(match[1]));
      else if ((match = route.match(/^POST \/doctor\/patients\/(\d+)\/extensions$/))) result = extend(db, user, Number(match[1]), data);
      else if ((match = route.match(/^GET \/doctor\/patients\/(\d+)\/extensions$/))) {
        const conversation = loadOwned(db, user.id, Number(match[1]));
        result = db.extensions
          .filter((e) => e.conversationId === conversation.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(({ conversationId: _id, ...extension }) => extension);
        mutated = false;
      } else throw new ApiError(404, 'Recurso não encontrado.');
    } else if (route === 'GET /conversations') {
      result = listConversations(db, user);
      mutated = false;
    } else if ((match = route.match(/^GET \/conversations\/(\d+)$/))) {
      result = toConversationDto(db, loadForParticipant(db, user, Number(match[1])), user);
      mutated = false;
    } else if ((match = route.match(/^GET \/conversations\/(\d+)\/messages$/))) {
      const conversation = loadForParticipant(db, user, Number(match[1]));
      result = db.messages.filter((m) => m.conversationId === conversation.id).sort((a, b) => a.id - b.id);
      mutated = false;
    } else if ((match = route.match(/^POST \/conversations\/(\d+)\/messages$/))) result = sendMessage(db, user, Number(match[1]), data);
    else if ((match = route.match(/^POST \/conversations\/(\d+)\/read$/))) mutated = markAsRead(db, user, Number(match[1]));
    else if ((match = route.match(/^POST \/conversations\/(\d+)\/extension-request$/))) result = requestExtension(db, user, Number(match[1]));
    else throw new ApiError(404, 'Recurso não encontrado.');
  }

  if (mutated) writeStorage(db);
  // Cópia profunda: a interface nunca deve compartilhar objetos com o "banco".
  return (result === undefined ? undefined : structuredClone(result)) as T;
}

// ---------------------------------------------------------------------------
// Dados de demonstração (mesmo roteiro do DemoDataLoader do backend)
// ---------------------------------------------------------------------------

function defaultSettings(doctorId: number): DbSettings {
  return {
    doctorId,
    notificationDays: [...WEEKDAYS],
    notificationStart: '08:00',
    notificationEnd: '18:00',
    welcomeMessageEnabled: true,
    welcomeMessage:
      'Olá! Recebi sua mensagem e responderei assim que possível, dentro do meu horário de atendimento. Em caso de urgência ou emergência, procure o pronto-socorro mais próximo ou ligue 192.',
  };
}

async function createSeed(): Promise<Db> {
  const db: Db = {
    version: 1,
    revision: Math.max(revisionOf(freshestDb()), 0),
    seq: 0,
    users: [],
    settings: [],
    conversations: [],
    messages: [],
    extensions: [],
    consents: [],
    sessions: {},
  };
  const now = new Date();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  /** Horário em um dia útil, `businessDaysAgo` dias úteis antes de hoje (0 = hoje). */
  const at = (businessDaysAgo: number, hour: number, minute: number) => {
    const day = new Date(now);
    let remaining = businessDaysAgo;
    while (remaining > 0) {
      day.setDate(day.getDate() - 1);
      if (day.getDay() !== 0 && day.getDay() !== 6) remaining--;
    }
    day.setHours(hour, minute, 0, 0);
    return day;
  };
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
  const day = today();

  const user = (name: string, email: string, role: Role, crm: string | null = null, specialty: string | null = null) => {
    const created: DbUser = { id: nextId(db), name, email, role, crm, specialty, passwordHash, createdAt: at(60, 9, 0).toISOString() };
    db.users.push(created);
    recordConsents(db, created, false);
    return created;
  };

  const ana = user('Dra. Ana Souza', 'ana@effexmed.com', 'DOCTOR', '123456-SP', 'Cardiologia');
  const anaSettings: DbSettings = {
    ...defaultSettings(ana.id),
    welcomeMessage:
      'Olá! Aqui é a Dra. Ana Souza. Recebi sua mensagem e vou responder assim que possível, de segunda a sexta, das 8h às 18h. Em caso de urgência, procure o pronto-socorro mais próximo ou ligue 192.',
  };
  const carlos = user('Dr. Carlos Mendes', 'carlos@effexmed.com', 'DOCTOR', '654321-SP', 'Clínica Geral');
  const carlosSettings: DbSettings = {
    ...defaultSettings(carlos.id),
    notificationDays: [...WEEKDAYS, 'SATURDAY'],
    notificationStart: '07:00',
    notificationEnd: '19:00',
    welcomeMessage:
      'Olá, aqui é o Dr. Carlos Mendes. Obrigado pelo contato! Respondo as mensagens de segunda a sábado, das 7h às 19h.',
  };
  db.settings.push(anaSettings, carlosSettings);

  const joao = user('João Pereira', 'joao@email.com', 'PATIENT');
  const maria = user('Maria Oliveira', 'maria@email.com', 'PATIENT');
  const pedro = user('Pedro Santos', 'pedro@email.com', 'PATIENT');
  const rafael = user('Rafael Costa', 'rafael@email.com', 'PATIENT');

  const conversation = (doctor: DbUser, patient: DbUser | null, expiresOn: string, createdAt: Date, email?: string, name?: string) => {
    const created: DbConversation = {
      id: nextId(db),
      doctorId: doctor.id,
      patientId: patient?.id ?? null,
      patientEmail: patient?.email ?? email!,
      patientName: patient?.name ?? name ?? null,
      expiresOn,
      createdAt: createdAt.toISOString(),
      lastMessageAt: null,
      extensionRequestedAt: null,
    };
    db.conversations.push(created);
    return created;
  };

  const save = (c: DbConversation, senderId: number | null, type: MessageType, content: string, when: Date, read: boolean, outside = false) => {
    const message = addMessage(db, c, senderId, type, content, when.toISOString(), outside);
    if (read) message.readAt = new Date(Math.min(when.getTime() + 3 * 60_000, now.getTime())).toISOString();
  };
  const patientSays = (c: DbConversation, patient: DbUser, settings: DbSettings, when: Date, read: boolean, content: string) =>
    save(c, patient.id, 'TEXT', content, when, read, !isWithinWindow(settings, when));
  const doctorSays = (c: DbConversation, when: Date, read: boolean, content: string) => save(c, c.doctorId, 'TEXT', content, when, read);
  const autoReply = (c: DbConversation, settings: DbSettings, when: Date) =>
    save(c, c.doctorId, 'AUTO_REPLY', settings.welcomeMessage!, new Date(when.getTime() + 2000), true);
  const system = (c: DbConversation, when: Date, content: string) => save(c, null, 'SYSTEM', content, when, false);

  // Dra. Ana x João: conversa ativa, com mensagem fora do horário e mensagens não lidas.
  const anaJoao = conversation(ana, joao, plusDays(day, 18), at(9, 9, 0));
  patientSays(anaJoao, joao, anaSettings, at(9, 9, 12), true, 'Bom dia, Dra. Ana! Comecei a tomar a losartana ontem, conforme a receita. É normal sentir um pouco de tontura ao levantar?');
  autoReply(anaJoao, anaSettings, at(9, 9, 12));
  doctorSays(anaJoao, at(9, 10, 5), true, 'Bom dia, João! Pode acontecer nos primeiros dias, sim. Levante-se devagar e beba bastante água. Se a tontura for forte ou vier acompanhada de desmaio, me avise imediatamente.');
  patientSays(anaJoao, joao, anaSettings, at(9, 10, 20), true, 'Entendido, muito obrigado!');
  patientSays(anaJoao, joao, anaSettings, at(3, 22, 47), true, 'Doutora, desculpe o horário. Medi a pressão agora e deu 14 por 9. Devo me preocupar?');
  doctorSays(anaJoao, at(2, 8, 15), true, 'Olá, João! Um valor isolado de 14x9 não é motivo de alarme. Continue medindo pela manhã e à noite e anote os valores para trazer no retorno.');
  patientSays(anaJoao, joao, anaSettings, at(2, 8, 30), true, 'Combinado, vou anotar tudo.');
  patientSays(anaJoao, joao, anaSettings, minutesAgo(52), false, 'Doutora, segue a média da semana: manhã 13x8,5 e noite 13,5x9.');
  patientSays(anaJoao, joao, anaSettings, minutesAgo(50), false, 'Posso fazer caminhada todos os dias?');

  // Dra. Ana x Maria: prazo terminando em 2 dias.
  const anaMaria = conversation(ana, maria, plusDays(day, 2), at(20, 9, 0));
  patientSays(anaMaria, maria, anaSettings, at(19, 14, 30), true, 'Boa tarde, doutora. O ecocardiograma ficou pronto. Posso falar sobre o resultado por aqui?');
  autoReply(anaMaria, anaSettings, at(19, 14, 30));
  doctorSays(anaMaria, at(19, 15, 10), true, 'Boa tarde, Maria! Pode sim. O que diz a conclusão do laudo?');
  patientSays(anaMaria, maria, anaSettings, at(19, 15, 22), true, 'Diz: função sistólica preservada, sem alterações significativas.');
  doctorSays(anaMaria, at(19, 15, 40), true, 'Ótimo resultado! Mantenha a medicação e nos vemos no retorno.');
  patientSays(anaMaria, maria, anaSettings, at(1, 19, 45), false, 'Doutora, meu retorno está chegando. Preciso fazer jejum para os exames de sangue?');

  // Dra. Ana x Pedro: prazo expirado, já estendido uma vez e com nova solicitação de extensão.
  const anaPedro = conversation(ana, pedro, plusDays(day, -5), at(35, 9, 0));
  patientSays(anaPedro, pedro, anaSettings, at(34, 10, 0), true, 'Olá, doutora. Fiquei com dúvida: tomo o remédio do colesterol de manhã ou à noite?');
  autoReply(anaPedro, anaSettings, at(34, 10, 0));
  doctorSays(anaPedro, at(34, 11, 30), true, 'Olá, Pedro! A sinvastatina deve ser tomada à noite, antes de dormir.');
  db.extensions.push({
    id: nextId(db),
    conversationId: anaPedro.id,
    days: 15,
    previousExpiresOn: plusDays(day, -20),
    newExpiresOn: plusDays(day, -5),
    note: 'Pagamento confirmado na recepção',
    createdAt: at(15, 9, 0).toISOString(),
  });
  system(anaPedro, at(15, 9, 0), `Prazo da conversa estendido por 15 dias. Disponível até ${formatBr(plusDays(day, -5))}.`);
  patientSays(anaPedro, pedro, anaSettings, at(7, 16, 0), true, 'Obrigado por estender o prazo, doutora. Os exames ficaram ótimos!');
  doctorSays(anaPedro, at(7, 16, 45), true, 'Que ótima notícia, Pedro! Parabéns pela dedicação ao tratamento.');
  anaPedro.extensionRequestedAt = at(1, 20, 10).toISOString();
  system(anaPedro, at(1, 20, 10), 'Solicitação de extensão do prazo enviada ao médico.');

  // Dra. Ana x Rafael: conversa nova, sem mensagens (bom para demonstrar a mensagem padrão).
  conversation(ana, rafael, plusDays(day, 29), at(1, 9, 0));

  // Dra. Ana x Lúcia: cadastrada apenas pelo e-mail, aguardando a criação da conta.
  conversation(ana, null, plusDays(day, 30), minutesAgo(180), 'lucia@email.com', 'Lúcia Ferreira');

  // Dr. Carlos x João: mesmo paciente atendido por outro médico.
  const carlosJoao = conversation(carlos, joao, plusDays(day, 9), at(5, 9, 0));
  patientSays(carlosJoao, joao, carlosSettings, at(5, 18, 20), true, 'Boa tarde, Dr. Carlos. A dor de garganta melhorou bastante com o anti-inflamatório.');
  autoReply(carlosJoao, carlosSettings, at(5, 18, 20));
  doctorSays(carlosJoao, at(5, 18, 40), true, 'Que bom, João! Termine o tratamento de 5 dias, mesmo que os sintomas desapareçam antes.');
  doctorSays(carlosJoao, at(2, 9, 0), false, 'Bom dia, João! Como está se sentindo hoje?');

  // Dr. Carlos x Maria: conversa iniciada pelo médico (sem mensagem automática).
  const carlosMaria = conversation(carlos, maria, plusDays(day, 12), at(3, 9, 0));
  doctorSays(carlosMaria, at(3, 17, 0), true, 'Olá, Maria! Conforme conversamos na consulta: tomar o antibiótico de 8 em 8 horas, por 7 dias.');
  patientSays(carlosMaria, maria, carlosSettings, at(3, 17, 30), true, 'Obrigada, doutor!');

  return db;
}
