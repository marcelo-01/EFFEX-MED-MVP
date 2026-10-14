import { Bot, Check, CheckCheck, Info, Moon } from 'lucide-react';
import type { Message } from '../api/types';
import { formatTime } from '../utils/format';

interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  /** Primeira mensagem de uma sequência do mesmo remetente (exibe a "ponta" do balão). */
  tail: boolean;
  showOutsideHours: boolean;
}

export function MessageBubble({ message, mine, tail, showOutsideHours }: MessageBubbleProps) {
  if (message.type === 'SYSTEM') {
    return (
      <div className="system-message">
        <span>
          <Info size={14} />
          {message.content}
        </span>
      </div>
    );
  }

  const isAuto = message.type === 'AUTO_REPLY';
  return (
    <div className={`bubble-row ${mine ? 'bubble-row--out' : 'bubble-row--in'} ${tail ? 'bubble-row--first' : ''}`}>
      <div className={`bubble ${mine ? 'bubble--out' : 'bubble--in'} ${tail ? 'bubble--tail' : ''} ${isAuto ? 'bubble--auto' : ''}`}>
        {isAuto && (
          <div className="bubble__label">
            <Bot size={13} /> Mensagem automática
          </div>
        )}
        <p className="bubble__text">{message.content}</p>
        <span className="bubble__meta">
          {showOutsideHours && message.outsideBusinessHours && (
            <span className="bubble__outside" title="Recebida fora do seu horário de notificações">
              <Moon size={11} /> fora do horário
            </span>
          )}
          {formatTime(message.sentAt)}
          {mine &&
            (message.readAt ? (
              <CheckCheck size={15} className="tick tick--read" aria-label="Lida" />
            ) : (
              <Check size={15} className="tick" aria-label="Enviada" />
            ))}
        </span>
      </div>
    </div>
  );
}
