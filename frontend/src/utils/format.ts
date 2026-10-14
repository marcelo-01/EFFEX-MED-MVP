import type { DayOfWeek } from '../api/types';

export const WEEK_DAYS: { value: DayOfWeek; short: string; long: string }[] = [
  { value: 'MONDAY', short: 'Seg', long: 'segunda' },
  { value: 'TUESDAY', short: 'Ter', long: 'terça' },
  { value: 'WEDNESDAY', short: 'Qua', long: 'quarta' },
  { value: 'THURSDAY', short: 'Qui', long: 'quinta' },
  { value: 'FRIDAY', short: 'Sex', long: 'sexta' },
  { value: 'SATURDAY', short: 'Sáb', long: 'sábado' },
  { value: 'SUNDAY', short: 'Dom', long: 'domingo' },
];

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const dayMonthFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const fullDateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** 14:35 */
export function formatTime(iso: string) {
  return timeFormat.format(new Date(iso));
}

/** Horário na lista de conversas: hoje → 14:35, ontem → Ontem, semana → Segunda-feira, depois → 01/10/2026. */
export function formatListDate(iso: string) {
  const date = new Date(iso);
  const diff = daysBetween(date, new Date());
  if (diff <= 0) return formatTime(iso);
  if (diff === 1) return 'Ontem';
  if (diff < 7) return capitalize(weekdayFormat.format(date));
  return shortDateFormat.format(date);
}

/** Separador de dia dentro do chat. */
export function formatDayDivider(iso: string) {
  const date = new Date(iso);
  const diff = daysBetween(date, new Date());
  if (diff <= 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return capitalize(weekdayFormat.format(date));
  return date.getFullYear() === new Date().getFullYear() ? dayMonthFormat.format(date) : fullDateFormat.format(date);
}

export function isSameDay(a: string, b: string) {
  return daysBetween(new Date(a), new Date(b)) === 0;
}

/** Converte uma data local "2026-11-01" sem sofrer com fuso horário. */
export function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toLocalDateValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** "2026-11-01" → 01/11/2026 */
export function formatDate(value: string) {
  return shortDateFormat.format(parseLocalDate(value));
}

export function formatDateTime(iso: string) {
  return `${shortDateFormat.format(new Date(iso))} às ${formatTime(iso)}`;
}

/** Texto do prazo a partir dos dias restantes calculados pelo servidor. */
export function remainingLabel(daysRemaining: number) {
  if (daysRemaining > 1) return `${daysRemaining} dias restantes`;
  if (daysRemaining === 1) return 'Termina amanhã';
  if (daysRemaining === 0) return 'Termina hoje';
  if (daysRemaining === -1) return 'Encerrado ontem';
  return `Encerrado há ${Math.abs(daysRemaining)} dias`;
}

/** "08:00:00" → "08:00" */
export function formatClock(value: string) {
  return value.slice(0, 5);
}

/** Resume os dias: [MONDAY..FRIDAY] → "seg. a sex."; todos → "todos os dias". */
export function formatDays(days: DayOfWeek[]) {
  const indexes = WEEK_DAYS.map((d, i) => (days.includes(d.value) ? i : -1)).filter((i) => i >= 0);
  if (indexes.length === 0) return 'nenhum dia';
  if (indexes.length === 7) return 'todos os dias';
  const isRange = indexes.every((value, i) => i === 0 || value === indexes[i - 1] + 1);
  const label = (i: number) => WEEK_DAYS[i].short.toLowerCase() + '.';
  if (isRange && indexes.length > 2) return `${label(indexes[0])} a ${label(indexes[indexes.length - 1])}`;
  return indexes.map(label).join(', ');
}

export function formatAvailability(days: DayOfWeek[], start: string, end: string) {
  return `${capitalize(formatDays(days))}, das ${formatClock(start)} às ${formatClock(end)}`;
}

export function initials(name: string) {
  const parts = name
    .replace(/^(dra?\.|dr\.)\s*/i, '')
    .split(/[\s@.]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function pluralDays(days: number) {
  return days === 1 ? '1 dia' : `${days} dias`;
}
