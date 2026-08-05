import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '@/lib/api/client';
import { getCurrentTenantLogo } from './api';

vi.mock('@/lib/api/client', () => ({
  http: { get: vi.fn() },
}));

const get = vi.mocked(http.get);

describe('getCurrentTenantLogo', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('returns the downloaded logo', async () => {
    const logo = new Blob(['logo'], { type: 'image/png' });
    get.mockResolvedValue({ data: logo, status: 200 });

    await expect(getCurrentTenantLogo()).resolves.toBe(logo);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('uses the fallback mark when no logo is configured', async () => {
    get.mockResolvedValue({ data: null, status: 204 });

    await expect(getCurrentTenantLogo()).resolves.toBeNull();
  });

  it('uses the fallback mark when optional logo storage fails', async () => {
    get.mockRejectedValue(new Error('Logo storage unavailable'));

    await expect(getCurrentTenantLogo()).resolves.toBeNull();
  });
});
