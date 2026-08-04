import { Book } from '@/types/book';
import { AppService } from '@/types/system';

/**
 * True when the URL is fetchable by external services (Readwise, markdown
 * readers), i.e. not a local dev server or the Tauri asset protocol.
 */
export const isPublicImageUrl = (url?: string | null): url is string =>
  !!url && /^https?:\/\/(?!localhost|127\.|asset\.localhost)/.test(url);

/**
 * Resolve a publicly accessible cover image URL for the book, or undefined
 * when none can be provided. Local-only builds do not publish private cover
 * files to a hosted bucket, so only an existing public metadata URL is used.
 */
export const getPublicCoverUrl = async (
  book: Book,
  appService: AppService | null,
): Promise<string | undefined> => {
  if (isPublicImageUrl(book.coverImageUrl)) return book.coverImageUrl;
  void appService;
  return undefined;
};
