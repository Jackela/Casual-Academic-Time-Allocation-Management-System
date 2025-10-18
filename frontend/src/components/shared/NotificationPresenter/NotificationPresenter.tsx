import { memo, useCallback, useEffect, useRef, useState } from 'react';
import NotificationBanner from '../NotificationBanner';
import type { NotificationPayload } from '../../../lib/routing/notificationRouter';
import type { NotificationCommand } from '../../../lib/notifications/notificationBus';
import { subscribeToNotifications } from '../../../lib/notifications/notificationBus';
import '../../../styles/dashboard-shell.css';

type BannerState = NotificationPayload & { id: number };
type ToastState = NotificationPayload & { id: number };

const BANNER_VARIANT_MAP: Record<
  NotificationPayload['severity'],
  'page-banner--info' | 'page-banner--warning' | 'page-banner--error'
> = {
  info: 'page-banner--info',
  success: 'page-banner--info',
  warning: 'page-banner--warning',
  error: 'page-banner--error',
};

const BANNER_ICON_MAP: Record<NotificationPayload['severity'], string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '🚫',
};

const TOAST_CLASS_MAP: Record<
  NotificationPayload['severity'],
  'dashboard-toast--info' | 'dashboard-toast--success' | 'dashboard-toast--error'
> = {
  info: 'dashboard-toast--info',
  success: 'dashboard-toast--success',
  warning: 'dashboard-toast--info',
  error: 'dashboard-toast--error',
};

const BANNER_TITLE_MAP: Record<NotificationPayload['severity'], string> = {
  info: 'Notice',
  success: 'Success',
  warning: 'Heads up',
  error: 'Issue detected',
};

const DEFAULT_TOAST_TIMEOUT = 6000;

const NotificationPresenter = memo(() => {
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastIdRef = useRef(0);
  const bannerIdRef = useRef(0);
  const toastTimers = useRef(new Map<number, number>());

  const clearToastTimer = useCallback((id: number) => {
    const timerId = toastTimers.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      toastTimers.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id: number) => {
      clearToastTimer(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearToastTimer],
  );

  const handleNotification = useCallback(
    (command: NotificationCommand) => {
      if (command.type === 'clear') {
        const { channel } = command;
        if (!channel || channel === 'banner') {
          setBanner(null);
        }
        if (!channel || channel === 'toast') {
          toastTimers.current.forEach((timerId) => clearTimeout(timerId));
          toastTimers.current.clear();
          setToasts([]);
        }
        return;
      }

      const payload = command.payload;

      if (payload.channel === 'banner') {
        const id = ++bannerIdRef.current;
        setBanner({ ...payload, id });
        return;
      }

      if (payload.channel === 'toast') {
        const id = ++toastIdRef.current;
        setToasts((current) => [...current, { ...payload, id }]);

        const timeout = payload.durationMs ?? DEFAULT_TOAST_TIMEOUT;
        if (typeof window !== 'undefined') {
          const timer = window.setTimeout(() => dismissToast(id), timeout);
          toastTimers.current.set(id, timer);
        }
      }
    },
    [dismissToast],
  );

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(handleNotification);
    return () => {
      unsubscribe();
      toastTimers.current.forEach((timerId) => {
        clearTimeout(timerId);
      });
      toastTimers.current.clear();
    };
  }, [handleNotification]);

  const dismissBanner = useCallback(() => {
    setBanner(null);
  }, []);

  const handleBannerAction = useCallback(() => {
    if (!banner?.cta) {
      return;
    }
    try {
      banner.cta.action();
    } finally {
      dismissBanner();
    }
  }, [banner, dismissBanner]);

  return (
    <>
      {banner && (
        <NotificationBanner
          icon={banner.icon ?? BANNER_ICON_MAP[banner.severity]}
          message={banner.message}
          title={banner.title ?? BANNER_TITLE_MAP[banner.severity]}
          variant={BANNER_VARIANT_MAP[banner.severity]}
          showDismiss={banner.dismissible ?? true}
          onDismiss={banner.dismissible === false ? undefined : dismissBanner}
          showAction={Boolean(banner.cta)}
          actionText={banner.cta?.label}
          onAction={banner.cta ? handleBannerAction : undefined}
        />
      )}

      <div
        className="dashboard-toast-stack pointer-events-none"
        data-testid="toast-stack"
        role="region"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`dashboard-toast ${TOAST_CLASS_MAP[toast.severity]}`}
            data-testid="toast"
            role="status"
          >
            <div className="dashboard-toast__content">
              {toast.title ? <strong className="block mb-1">{toast.title}</strong> : null}
              <p>{toast.message}</p>
            </div>
            {toast.cta && (
              <button
                type="button"
                className="dashboard-toast__cta pointer-events-auto"
                onClick={() => {
                  toast.cta?.action();
                  dismissToast(toast.id);
                }}
              >
                {toast.cta.label}
              </button>
            )}
            <button
              type="button"
              className="dashboard-toast__dismiss pointer-events-auto"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
});

NotificationPresenter.displayName = 'NotificationPresenter';

export default NotificationPresenter;
