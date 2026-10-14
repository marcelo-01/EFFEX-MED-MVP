import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, MessageCircle, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info' | 'message';

interface ToastOptions {
  title: string;
  description?: string;
  tone?: Tone;
  onClick?: () => void;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info, message: MessageCircle };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { ...options, id }]);
      window.setTimeout(() => dismiss(id), options.tone === 'message' ? 6000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const tone = toast.tone ?? 'info';
          const Icon = ICONS[tone];
          return (
            <div
              key={toast.id}
              className={`toast toast--${tone} ${toast.onClick ? 'toast--clickable' : ''}`}
              onClick={() => {
                if (toast.onClick) {
                  toast.onClick();
                  dismiss(toast.id);
                }
              }}
            >
              <Icon size={20} className="toast__icon" />
              <div className="toast__body">
                <strong>{toast.title}</strong>
                {toast.description && <span>{toast.description}</span>}
              </div>
              <button
                type="button"
                className="toast__close"
                aria-label="Fechar"
                onClick={(event) => {
                  event.stopPropagation();
                  dismiss(toast.id);
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return context;
}
