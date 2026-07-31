import { stubTranslation as _ } from '@/utils/misc';
import { TranslationProvider } from '../types';
import { normalizeToShortLang } from '@/utils/lang';
import { useSettingsStore } from '@/store/settingsStore';

export const deeplProvider: TranslationProvider = {
  name: 'deepl',
  label: _('DeepL'),
  authRequired: false,
  translate: async (
    text: string[],
    sourceLang: string,
    targetLang: string,
    _token?: string | null,
    _useCache: boolean = false,
  ): Promise<string[]> => {
    const settings = useSettingsStore.getState().settings;
    const apiKey = settings.deeplApiKey?.trim();
    const baseUrl = (settings.deeplBaseUrl?.trim() || 'https://api-free.deepl.com/v2').replace(
      /\/+$/,
      '',
    );
    if (!apiKey) throw new Error('DeepL API key is required');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    };

    const normalizedSourceLang = normalizeToShortLang(sourceLang).toUpperCase();
    const body = JSON.stringify({
      text: text,
      ...(normalizedSourceLang !== 'AUTO' ? { source_lang: normalizedSourceLang } : {}),
      target_lang: normalizeToShortLang(targetLang).toUpperCase(),
    });

    const response = await fetch(`${baseUrl}/translate`, { method: 'POST', headers, body });

    if (!response.ok) {
      throw new Error(`Translation failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.translations) {
      throw new Error('Invalid response from translation service');
    }

    return text.map((line, i) => {
      if (!line?.trim().length) return line;
      return data.translations?.[i]?.text || line;
    });
  },
};
