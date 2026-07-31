import { useCallback, useEffect, useRef } from 'react';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { eventDispatcher } from '@/utils/event';
import { getActiveFileSyncBackends } from '@/services/sync/cloudSyncProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { useLibraryStore } from '@/store/libraryStore';
import { runFileLibrarySyncPass } from '@/services/sync/file/runLibrarySync';

/**
 * Runs the user-configured file-sync backends for every library sync surface.
 * Readest Cloud rows and account-backed book replication are intentionally not
 * part of the local-first application.
 */
export const useBooksSync = () => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const libraryLoaded = useLibraryStore((s) => s.libraryLoaded);
  const isSyncingRef = useRef(false);

  const pullLibrary = useCallback(
    async (_fullRefresh = false, verbose = false) => {
      const backends = getActiveFileSyncBackends(useSettingsStore.getState().settings);
      if (!libraryLoaded || backends.length === 0 || isSyncingRef.current) return;

      isSyncingRef.current = true;
      try {
        const result = await runFileLibrarySyncPass(envConfig, _);
        if (verbose) {
          eventDispatcher.dispatch('toast', {
            type: result ? 'info' : 'error',
            message: result
              ? _('{{count}} book(s) synced', { count: result.booksSynced })
              : _('Sync failed'),
          });
        }
      } finally {
        isSyncingRef.current = false;
      }
    },
    [_, envConfig, libraryLoaded],
  );

  useEffect(() => {
    void pullLibrary();
  }, [pullLibrary]);

  return { pullLibrary, pushLibrary: pullLibrary };
};
