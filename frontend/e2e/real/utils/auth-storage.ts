import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_ROOT = path.resolve(__dirname, '../../shared/.auth');

export const ADMIN_STORAGE = path.resolve(AUTH_ROOT, 'admin.json');
export const LECTURER_STORAGE = path.resolve(AUTH_ROOT, 'lecturer.json');
export const TUTOR_STORAGE = path.resolve(AUTH_ROOT, 'tutor.json');

export const storageForRole = (role: 'admin' | 'lecturer' | 'tutor') => {
  switch (role) {
    case 'admin':
      return ADMIN_STORAGE;
    case 'lecturer':
      return LECTURER_STORAGE;
    case 'tutor':
      return TUTOR_STORAGE;
    default:
      throw new Error(`Unsupported role: ${role as string}`);
  }
};
