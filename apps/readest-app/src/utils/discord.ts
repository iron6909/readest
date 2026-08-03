import { invoke } from '@tauri-apps/api/core';
import { Book } from '@/types/book';
import { AppService } from '@/types/system';

type CacheEntry = {
  url: string | null;
  expiresAt: number;
  failures: number;
};

const coverUrlCache = new Map<string, CacheEntry>();
// A resolved URL is content-addressed and therefore stable; we only re-upload
// often enough to stay ahead of the temp bucket's retention.
// No cover.png on disk is a durable state, but a synced cover can still land
// later, so keep re-checking on the same slow cadence.
const MISSING_COVER_TTL = 60 * 60 * 1000;
// A failed upload is almost always the network. Caching that for an hour is
// what made covers "stop working" long after connectivity came back (issue
// #5352), so retry soon — and back off, because the presence tick fires every
// 15s and must not turn an outage into an upload loop.

const remember = (bookHash: string, url: string | null, ttl: number) => {
  coverUrlCache.set(bookHash, { url, expiresAt: Date.now() + ttl, failures: 0 });
};

type BookPresence = {
  bookHash: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  sessionStart: number;
};

/**
 * Readest no longer uploads book covers to hosted storage. Discord presence
 * still reports the book metadata, but leaves the cover URL empty.
 */
const getCoverUrlForDiscord = async (
  book: Book,
  _appService: AppService,
): Promise<string | undefined> => {
  const cached = coverUrlCache.get(book.hash);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url ?? undefined;
  }

  remember(book.hash, null, MISSING_COVER_TTL);
  return undefined;
};

/**
 * Update Discord Rich Presence with current book information
 */
export const updateDiscordPresence = async (
  book: Book,
  sessionStart: number,
  appService: AppService,
): Promise<void> => {
  if (!appService?.isDesktopApp) return;

  try {
    const coverUrl = await getCoverUrlForDiscord(book, appService);
    const bookPresence: BookPresence = {
      bookHash: book.hash,
      title: book.title,
      author: book.author || null,
      coverUrl: coverUrl || null,
      sessionStart,
    };

    await invoke('update_book_presence', { presence: bookPresence });
  } catch (error) {
    console.warn('Failed to update Discord presence:', error);
  }
};

/**
 * Clear Discord Rich Presence
 */
export const clearDiscordPresence = async (appService: AppService): Promise<void> => {
  if (!appService?.isDesktopApp) return;

  try {
    await invoke('clear_book_presence');
  } catch (error) {
    console.warn('Failed to clear Discord presence:', error);
  }
};
