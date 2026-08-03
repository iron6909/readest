import { describe, expect, test, vi } from 'vitest';

vi.mock('@/services/environment', () => ({ isWebAppPlatform: () => true }));
vi.mock('@/utils/transfer', () => ({
  webDownload: vi.fn(async () => ({ headers: new Headers(), blob: new Blob(['book']) })),
  tauriDownload: vi.fn(),
}));

import { downloadFromUrl } from '@/libs/directDownload';

describe('downloadFromUrl', () => {
  test('requires an explicit source URL', async () => {
    await expect(
      downloadFromUrl({ appService: { writeFile: vi.fn() } as never, dst: '/book.epub' } as never),
    ).rejects.toThrow('Download URL is required');
  });
});
