import { describe, it, expect, vi } from 'vitest';

vi.mock('../api-secure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api-secure')>();
  return {
    ...actual,
    secureApiClient: {
      get: vi.fn(),
      // only methods used in this test are mocked
      createQueryString: (o: any) => new URLSearchParams(o).toString(),
    } as any,
  };
});

describe('users service - getTutorDefaults', () => {
  it('returns { defaultQualification: null } when backend errors', async () => {
    const { secureApiClient } = await import('../api-secure');
    (secureApiClient.get as any).mockRejectedValueOnce(new Error('500'));

    const { getTutorDefaults } = await import('../users');
    const result = await getTutorDefaults(123);
    expect(result).toEqual({ defaultQualification: null });
  });

  it('passes through backend value when successful', async () => {
    const { secureApiClient } = await import('../api-secure');
    (secureApiClient.get as any).mockResolvedValueOnce({ data: { defaultQualification: 'STANDARD' } });

    const { getTutorDefaults } = await import('../users');
    const result = await getTutorDefaults(123);
    expect(result).toEqual({ defaultQualification: 'STANDARD' });
  });
});

