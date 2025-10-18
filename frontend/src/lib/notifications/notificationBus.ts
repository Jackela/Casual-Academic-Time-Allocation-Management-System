import type {
  NotificationChannel,
  NotificationPayload,
} from '../routing/notificationRouter';

export type NotificationCommand =
  | { type: 'show'; payload: NotificationPayload }
  | { type: 'clear'; channel?: NotificationChannel };

type NotificationListener = (command: NotificationCommand) => void;

const listeners = new Set<NotificationListener>();

/**
 * Subscribe to notification bus commands emitted by the notification router.
 * Returns an unsubscribe function that removes the listener.
 */
export function subscribeToNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function broadcast(command: NotificationCommand): void {
  if (!listeners.size) {
    return;
  }

  for (const listener of Array.from(listeners)) {
    try {
      listener(command);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[NotificationBus] listener error', error);
    }
  }
}

/**
 * Publish a notification payload to all active listeners.
 */
export function publishNotification(payload: NotificationPayload): void {
  broadcast({ type: 'show', payload });
}

/**
 * Issue a clear command to remove notifications for a specific channel
 * (or all channels if omitted).
 */
export function clearNotifications(channel?: NotificationChannel): void {
  broadcast({ type: 'clear', channel });
}
