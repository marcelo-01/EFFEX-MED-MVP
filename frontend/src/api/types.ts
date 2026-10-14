export type Role = 'DOCTOR' | 'PATIENT';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  crm: string | null;
  specialty: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type ConversationStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

export type MessageType = 'TEXT' | 'AUTO_REPLY' | 'SYSTEM';

export interface Message {
  id: number;
  conversationId: number;
  senderId: number | null;
  senderName: string | null;
  type: MessageType;
  content: string;
  sentAt: string;
  readAt: string | null;
  outsideBusinessHours: boolean;
}

export interface Participant {
  id: number | null;
  name: string;
  email: string;
  detail: string;
}

export interface DoctorAvailability {
  days: DayOfWeek[];
  start: string;
  end: string;
  availableNow: boolean;
}

export interface Conversation {
  id: number;
  counterpart: Participant;
  expiresOn: string;
  daysRemaining: number;
  status: ConversationStatus;
  canSend: boolean;
  extensionRequested: boolean;
  extensionRequestAllowed: boolean;
  lastMessage: Message | null;
  unreadCount: number;
  doctorAvailability: DoctorAvailability;
}

export interface Patient {
  conversationId: number;
  name: string;
  email: string;
  registered: boolean;
  expiresOn: string;
  daysRemaining: number;
  status: ConversationStatus;
  createdAt: string;
  lastMessageAt: string | null;
  unreadCount: number;
  extensionRequested: boolean;
  extensionCount: number;
  removable: boolean;
}

export interface Extension {
  id: number;
  days: number;
  previousExpiresOn: string;
  newExpiresOn: string;
  note: string | null;
  createdAt: string;
}

export interface Settings {
  notificationDays: DayOfWeek[];
  notificationStart: string;
  notificationEnd: string;
  defaultConversationDays: number;
  allowExtensionRequests: boolean;
  defaultExtensionDays: number;
  welcomeMessageEnabled: boolean;
  welcomeMessage: string | null;
}

export type ChatEvent =
  | { type: 'MESSAGE_CREATED'; conversationId: number; data: Message; alert: boolean }
  | { type: 'MESSAGES_READ'; conversationId: number; data: { readerId: number; readAt: string }; alert: boolean }
  | { type: 'CONVERSATION_UPDATED'; conversationId: number; data: null; alert: boolean }
  | { type: 'TYPING'; conversationId: number; data: { userId: number }; alert: boolean };
