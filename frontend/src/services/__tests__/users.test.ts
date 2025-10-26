import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api-secure', () => {
  return {
    secureApiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      createQueryString: (params: Record<string, any>) => new URLSearchParams(Object.entries(params).flatMap(([k,v]) => Array.isArray(v) ? v.map(e => [k, String(e)]) : [[k, String(v)]] )).toString(),
    },
  };
});

import { fetchUsers, createUser, updateUser, fetchTutorsForLecturer } from '../users';
import { secureApiClient } from '../api-secure';

describe('users service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetchUsers returns data on success', async () => {
    (secureApiClient.get as any).mockResolvedValue({ data: [{ id: 1, email: 'a@b.c', name: 'A', role: 'ADMIN', isActive: true }] });
    const users = await fetchUsers();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('a@b.c');
  });

  it('createUser normalizes names and posts payload', async () => {
    (secureApiClient.post as any).mockResolvedValue({ data: { id: 2, email: 'x@y.z', name: 'Jane Doe', role: 'TUTOR', isActive: true } });
    const result = await createUser({ firstName: ' Jane ', lastName: ' Doe ', email: 'x@y.z', role: 'TUTOR' as any, password: 'Passw0rd!' });
    expect(secureApiClient.post).toHaveBeenCalledWith('/api/users', {
      email: 'x@y.z',
      name: 'Jane Doe',
      role: 'TUTOR',
      password: 'Passw0rd!',
    });
    expect(result.name).toBe('Jane Doe');
  });

  it('updateUser delegates to patch with id path', async () => {
    (secureApiClient.patch as any).mockResolvedValue({ data: { id: 3, email: 'l@t.z', name: 'Lecturer T', role: 'LECTURER', isActive: true } });
    const result = await updateUser(3, { isActive: true });
    expect(secureApiClient.patch).toHaveBeenCalledWith('/api/users/3', { isActive: true });
    expect(result.id).toBe(3);
  });

  it('fetchTutorsForLecturer builds correct query', async () => {
    (secureApiClient.get as any).mockResolvedValue({ data: [] });
    await fetchTutorsForLecturer(99);
    const call = (secureApiClient.get as any).mock.calls[0][0] as string;
    expect(call).toContain('/api/users?');
    expect(call).toContain('role=TUTOR');
    expect(call).toContain('lecturerId=99');
    expect(call).toContain('active=true');
  });
});

