let audioContext: AudioContext | null = null;

/** Som curto de notificação gerado via Web Audio (sem arquivos de áudio). */
export function playNotificationSound() {
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    [880, 1320].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const start = now + index * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });
  } catch {
    /* áudio indisponível */
  }
}

export function browserNotificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function browserNotificationPermission(): NotificationPermission | 'unsupported' {
  return browserNotificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestBrowserNotifications() {
  if (!browserNotificationsSupported()) return 'unsupported' as const;
  return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string, onClick?: () => void) {
  if (!browserNotificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, { body, icon: '/favicon.svg', tag: title });
    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };
  } catch {
    /* alguns navegadores móveis exigem service worker */
  }
}
