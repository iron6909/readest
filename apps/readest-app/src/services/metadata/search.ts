import { useSettingsStore } from '@/store/settingsStore';
import { MetadataService } from './service';
import type { MetadataResult, SearchRequest } from './types';

export const searchMetadata = async (request: SearchRequest): Promise<MetadataResult[]> => {
  const apiKey = useSettingsStore.getState().settings.googleBooksApiKey || '';
  return new MetadataService({ googleBooksApiKeys: apiKey }).search(request);
};
