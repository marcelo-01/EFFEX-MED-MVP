import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { LoaderCircle, SendHorizontal } from 'lucide-react';

interface ComposerProps {
  onSend: (content: string) => Promise<void>;
  onTyping: () => void;
  placeholder?: string;
}

const MAX_LENGTH = 2000;

export function Composer({ onSend, onTyping, placeholder = 'Digite uma mensagem' }: ComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingAt = useRef(0);

  const resize = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 140)}px`;
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await onSend(content);
      setText('');
      requestAnimationFrame(resize);
    } catch {
      /* o erro já foi exibido; o texto é mantido para nova tentativa */
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        ref={textareaRef}
        value={text}
        rows={1}
        maxLength={MAX_LENGTH}
        placeholder={placeholder}
        aria-label="Mensagem"
        onKeyDown={onKeyDown}
        onChange={(event) => {
          setText(event.target.value);
          resize();
          if (Date.now() - lastTypingAt.current > 2000) {
            lastTypingAt.current = Date.now();
            onTyping();
          }
        }}
      />
      <button type="submit" className="composer__send" disabled={!text.trim() || sending} aria-label="Enviar mensagem">
        {sending ? <LoaderCircle size={20} className="spin" /> : <SendHorizontal size={20} />}
      </button>
    </form>
  );
}
