import { request } from './http';
import type { AuthResponse, Conversation, Extension, Message, Patient, Settings, User } from './types';

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/login', { email, password }),
  registerDoctor: (data: { name: string; email: string; password: string; crm: string; specialty: string }) =>
    request<AuthResponse>('POST', '/auth/register/doctor', data),
  registerPatient: (data: { name: string; email: string; password: string }) =>
    request<AuthResponse>('POST', '/auth/register/patient', data),
  me: () => request<User>('GET', '/auth/me'),
};

export const chatApi = {
  list: () => request<Conversation[]>('GET', '/conversations'),
  get: (id: number) => request<Conversation>('GET', `/conversations/${id}`),
  messages: (id: number) => request<Message[]>('GET', `/conversations/${id}/messages`),
  send: (id: number, content: string) => request<Message>('POST', `/conversations/${id}/messages`, { content }),
  markAsRead: (id: number) => request<void>('POST', `/conversations/${id}/read`),
  requestExtension: (id: number) => request<Conversation>('POST', `/conversations/${id}/extension-request`),
};

export const patientsApi = {
  list: () => request<Patient[]>('GET', '/doctor/patients'),
  register: (data: { email: string; name?: string; expiresOn?: string }) =>
    request<Patient>('POST', '/doctor/patients', data),
  update: (id: number, data: { name?: string; expiresOn?: string }) =>
    request<Patient>('PATCH', `/doctor/patients/${id}`, data),
  extend: (id: number, days: number, note?: string) =>
    request<Patient>('POST', `/doctor/patients/${id}/extensions`, { days, note }),
  extensions: (id: number) => request<Extension[]>('GET', `/doctor/patients/${id}/extensions`),
  remove: (id: number) => request<void>('DELETE', `/doctor/patients/${id}`),
};

export const settingsApi = {
  get: () => request<Settings>('GET', '/doctor/settings'),
  update: (data: Settings) => request<Settings>('PUT', '/doctor/settings', data),
};
