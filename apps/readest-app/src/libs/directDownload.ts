import { isWebAppPlatform } from '@/services/environment';
import type { AppService } from '@/types/system';
import { tauriDownload, webDownload, type ProgressHandler } from '@/utils/transfer';

export interface DownloadFromUrlParams {
  appService: AppService;
  dst: string;
  url: string;
  headers?: Record<string, string>;
  singleThreaded?: boolean;
  skipSslVerification?: boolean;
  onProgress?: ProgressHandler;
}

export const downloadFromUrl = async ({
  appService,
  dst,
  url,
  headers,
  singleThreaded,
  skipSslVerification,
  onProgress,
}: DownloadFromUrlParams) => {
  if (!url) throw new Error('Download URL is required');
  if (isWebAppPlatform()) {
    const { headers: responseHeaders, blob } = await webDownload(url, onProgress, headers);
    await appService.writeFile(dst, 'None', await blob.arrayBuffer());
    return responseHeaders;
  }
  return tauriDownload(
    url,
    dst,
    onProgress,
    headers,
    undefined,
    singleThreaded,
    skipSslVerification,
  );
};
