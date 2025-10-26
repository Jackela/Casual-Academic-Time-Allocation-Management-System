import { describe, it, expect, vi } from 'vitest';

vi.mock('../api-secure', () => ({
  secureApiClient: {
    post: vi.fn(async () => { throw { success: false, error: { code: 'API_ERROR' } }; }),
  },
}));

import { createUser } from '../users';

describe('users service (error paths)', () => {
  it('createUser propagates API error', async () => {
    await expect(createUser({
      firstName: 'A',
      lastName: 'B',
      email: 'x@y.z',
      role: 'TUTOR' as any,
      password: 'Passw0rd!',
    })).rejects.toMatchObject({ success: false });
  });
});

