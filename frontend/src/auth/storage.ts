import { STORAGE_KEYS } from '../utils/storage-keys';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export type StoredSession = {
  token: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
};

const getKey = (key: keyof typeof STORAGE_KEYS) => STORAGE_KEYS[key];

export const authStorage = {
  getSession(): StoredSession {
    if (!isBrowser()) {
      return { token: null, refreshToken: null, expiresAt: null };
    }

    try {
      const token = window.localStorage.getItem(getKey('TOKEN'));
      const refreshToken = window.localStorage.getItem(getKey('REFRESH_TOKEN'));
      const expiresAtRaw = window.localStorage.getItem(getKey('TOKEN_EXPIRY'));
      const expiresAt = expiresAtRaw ? Number.parseInt(expiresAtRaw, 10) : null;

      return {
        token,
        refreshToken: refreshToken ?? null,
        expiresAt: Number.isNaN(expiresAt) ? null : expiresAt,
      };
    } catch {
      return { token: null, refreshToken: null, expiresAt: null };
    }
  },

  setSession(session: StoredSession): void {
    if (!isBrowser()) return;

    const { token, refreshToken, expiresAt } = session;

    if (token) {
      window.localStorage.setItem(getKey('TOKEN'), token);
    }

    if (typeof refreshToken !== 'undefined') {
      if (refreshToken) {
        window.localStorage.setItem(getKey('REFRESH_TOKEN'), refreshToken);
      } else {
        window.localStorage.removeItem(getKey('REFRESH_TOKEN'));
      }
    }

    if (typeof expiresAt === 'number') {
      window.localStorage.setItem(getKey('TOKEN_EXPIRY'), String(expiresAt));
    } else {
      window.localStorage.removeItem(getKey('TOKEN_EXPIRY'));
    }
  },

  clearSession(): void {
    if (!isBrowser()) return;

    window.localStorage.removeItem(getKey('TOKEN'));
    window.localStorage.removeItem(getKey('REFRESH_TOKEN'));
    window.localStorage.removeItem(getKey('TOKEN_EXPIRY'));
  },
};
