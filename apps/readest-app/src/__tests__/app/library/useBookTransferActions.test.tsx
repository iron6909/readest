import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { Book } from '@/types/book';
import type { EnvConfigType } from '@/services/environment';
import type { AppService } from '@/types/system';
import type { ProgressPayload } from '@/utils/transfer';

/** Per-book transfers route only to enabled user-owned file backends. */

const routing = vi.hoisted(() => ({
  backends: [] as ('webdav' | 'gdrive' | 's3' | 'onedrive')[],
}));

const runFileBookUpload = vi.hoisted(() => vi.fn(async () => true));
const runFileBookDownload = vi.hoisted(() => vi.fn(async () => true));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation:
    () =>
    (text: string, params?: Record<string, string | number>): string => {
      if (!params) return text;
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
        text,
      );
    },
}));

vi.mock('@/services/sync/cloudSyncProvider', () => ({
  getActiveFileSyncBackends: () => routing.backends,
}));

vi.mock('@/services/sync/file/runLibrarySync', () => ({
  runFileBookUpload,
  runFileBookDownload,
}));

const { useBookTransferActions } = await import('@/app/library/hooks/useBookTransferActions');
const { eventDispatcher } = await import('@/utils/event');

const envConfig: EnvConfigType = { getAppService: async () => ({}) as AppService };

const makeBook = (over: Partial<Book> = {}): Book => ({
  hash: 'book-1',
  format: 'EPUB',
  title: 'Title',
  author: 'Author',
  createdAt: 1000,
  updatedAt: 1000,
  ...over,
});

const setup = () => {
  const updateBook = vi.fn(async (_envConfig: EnvConfigType, _book: Book) => {});
  const updateBookTransferProgress = vi.fn((_bookHash: string, _progress: ProgressPayload) => {});
  const { result } = renderHook(() =>
    useBookTransferActions(envConfig, null, updateBook, updateBookTransferProgress),
  );
  return { result, updateBook };
};

beforeEach(() => {
  vi.clearAllMocks();
  routing.backends = [];
});

describe('useBookTransferActions upload routing (issue #5062)', () => {
  it('uploads to enabled user-owned file backends', async () => {
    routing.backends = ['gdrive'];

    const { result } = setup();
    const book = makeBook();
    const ok = await result.current.handleBookUpload(book);

    expect(runFileBookUpload).toHaveBeenCalledWith(envConfig, book);
    expect(ok).toBe(true);
  });

  it('toasts "turn on a provider" and returns false when nothing is enabled', async () => {
    routing.backends = [];
    const dispatchSpy = vi.spyOn(eventDispatcher, 'dispatch');

    const { result } = setup();
    const book = makeBook();
    const ok = await result.current.handleBookUpload(book);

    expect(runFileBookUpload).not.toHaveBeenCalled();
    expect(ok).toBe(false);
    const toastCalls = dispatchSpy.mock.calls.filter(([event]) => event === 'toast');
    expect(toastCalls).toHaveLength(1);
    expect(toastCalls[0]?.[1]).toMatchObject({
      type: 'info',
      message: 'Turn on a provider in Cloud Sync settings to upload this book',
    });
  });
});

describe('useBookTransferActions download routing (issue #5062)', () => {
  it('downloads from a file backend even when legacy uploadedAt is present', async () => {
    routing.backends = ['webdav'];

    const { result } = setup();
    const book = makeBook({ uploadedAt: 12345 });
    const ok = await result.current.handleBookDownload(book, { queued: true });

    expect(runFileBookDownload).toHaveBeenCalledWith(envConfig, book);
    expect(ok).toBe(true);
  });

  it('downloads a book without legacy uploaded state from a file backend', async () => {
    routing.backends = ['webdav'];

    const { result, updateBook } = setup();
    const book = makeBook({ uploadedAt: null });
    const ok = await result.current.handleBookDownload(book, { queued: true });

    expect(runFileBookDownload).toHaveBeenCalledWith(envConfig, book);
    expect(updateBook).toHaveBeenCalledWith(envConfig, book);
    expect(ok).toBe(true);
  });
});
