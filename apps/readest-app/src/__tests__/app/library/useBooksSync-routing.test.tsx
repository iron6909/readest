import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const routing = vi.hoisted(() => ({ backends: [] as ('webdav' | 'gdrive' | 's3' | 'onedrive')[] }));
const runFileLibrarySyncPass = vi.hoisted(() =>
  vi.fn(async (): Promise<{ booksSynced: number } | null> => ({ booksSynced: 1 })),
);

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {} }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (text: string, params?: Record<string, string | number>) =>
    params
      ? Object.entries(params).reduce(
          (result, [key, value]) => result.replace(`{{${key}}}`, String(value)),
          text,
        )
      : text,
}));

vi.mock('@/services/sync/cloudSyncProvider', () => ({
  getActiveFileSyncBackends: () => routing.backends,
}));

vi.mock('@/services/sync/file/runLibrarySync', () => ({ runFileLibrarySyncPass }));

const { useBooksSync } = await import('@/app/library/hooks/useBooksSync');
const { useLibraryStore } = await import('@/store/libraryStore');
const { eventDispatcher } = await import('@/utils/event');

beforeEach(() => {
  vi.clearAllMocks();
  routing.backends = [];
  useLibraryStore.setState({ libraryLoaded: true });
});

afterEach(cleanup);

describe('useBooksSync', () => {
  it('runs enabled file providers without a Readest user', async () => {
    routing.backends = ['webdav'];

    renderHook(() => useBooksSync());

    await waitFor(() => expect(runFileLibrarySyncPass).toHaveBeenCalledOnce());
  });

  it('does nothing when no file provider is enabled', async () => {
    renderHook(() => useBooksSync());

    await act(async () => {
      await Promise.resolve();
    });
    expect(runFileLibrarySyncPass).not.toHaveBeenCalled();
  });

  it('reports one file-sync result for a manual refresh', async () => {
    routing.backends = ['gdrive'];
    const dispatchSpy = vi.spyOn(eventDispatcher, 'dispatch');
    const { result } = renderHook(() => useBooksSync());

    await waitFor(() => expect(runFileLibrarySyncPass).toHaveBeenCalledOnce());
    dispatchSpy.mockClear();

    await act(async () => {
      await result.current.pullLibrary(false, true);
    });

    expect(dispatchSpy).toHaveBeenCalledWith('toast', {
      type: 'info',
      message: '1 book(s) synced',
    });
  });
});
