import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GoogleBooksProvider } from '@/services/metadata/providers/googlebooks';

describe('Google Books local configuration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ items: [] })));
  });

  test('uses a locally configured key', async () => {
    const provider = new GoogleBooksProvider('user-key');
    await provider.search({ title: 'The Left Hand of Darkness' });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('key=user-key'), expect.anything());
  });

  test('searches anonymously when no key is configured', async () => {
    const provider = new GoogleBooksProvider('');
    await provider.search({ title: 'The Left Hand of Darkness' });

    expect(fetch).toHaveBeenCalledWith(expect.not.stringContaining('key='), expect.anything());
  });
});
