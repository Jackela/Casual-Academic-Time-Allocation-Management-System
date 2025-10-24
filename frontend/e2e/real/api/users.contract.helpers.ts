import { expect } from '@playwright/test';

type PartialUser = {
  id?: unknown;
  email?: unknown;
  name?: unknown;
  role?: unknown;
  isActive?: unknown;
  active?: unknown;
};

export function assertUserResponseShape(body: unknown, expectations?: { email?: string; role?: 'ADMIN'|'LECTURER'|'TUTOR' }) {
  const user = body as PartialUser;
  expect(user && typeof user === 'object').toBeTruthy();
  expect(typeof user.id === 'number').toBeTruthy();
  expect(typeof user.email === 'string').toBeTruthy();
  expect(typeof user.name === 'string' || typeof user.name === 'undefined').toBeTruthy();
  expect(['ADMIN', 'LECTURER', 'TUTOR'].includes(String(user.role))).toBeTruthy();

  // Some backends expose either `isActive` or `active` – accept either
  if (typeof user.isActive !== 'undefined') expect(typeof user.isActive === 'boolean').toBeTruthy();
  if (typeof user.active   !== 'undefined') expect(typeof user.active   === 'boolean').toBeTruthy();

  if (expectations?.email) {
    expect(String(user.email)).toBe(expectations.email);
  }
  if (expectations?.role) {
    expect(String(user.role)).toBe(expectations.role);
  }
}

