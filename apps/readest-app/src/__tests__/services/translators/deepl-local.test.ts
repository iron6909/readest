import { beforeEach, describe, expect, test, vi } from 'vitest';

const settings = vi.hoisted(() => ({
  deeplApiKey: 'user-key',
  deeplBaseUrl: 'https://api-free.deepl.com/v2',
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ settings }),
  },
}));

import { deeplProvider } from '@/services/translators/providers/deepl';

describe('local DeepL credentials', () => {
  beforeEach(() => {
    settings.deeplApiKey = 'user-key';
    settings.deeplBaseUrl = 'https://api-free.deepl.com/v2';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ translations: [{ text: 'Hallo' }] })),
    );
  });

  test('sends the configured key directly to the configured DeepL endpoint', async () => {
    await expect(deeplProvider.translate(['Hello'], 'EN', 'DE')).resolves.toEqual(['Hallo']);

    expect(fetch).toHaveBeenCalledWith(
      'https://api-free.deepl.com/v2/translate',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'DeepL-Auth-Key user-key' }),
      }),
    );
  });

  test('requires a locally configured key', async () => {
    settings.deeplApiKey = '';
    await expect(deeplProvider.translate(['Hello'], 'EN', 'DE')).rejects.toThrow(
      'DeepL API key is required',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
