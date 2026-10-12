import { useCallback, useMemo } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { translations, Language } from './translations';

export const getTranslation = (lang: Language | string, key: string, fallback?: string): string => {
  const currentLang: Language = (lang === 'en' || lang === 'ar' || lang === 'he') ? lang : 'he';
  const entry = translations[key];
  if (entry && entry[currentLang]) {
    return entry[currentLang];
  }
  if (fallback !== undefined) {
    return fallback;
  }
  if (entry && entry['he']) {
    return entry['he'];
  }
  return key;
};

export const useTranslation = () => {
  const { settings } = useSettings();
  const lang: Language = (settings?.language === 'en' || settings?.language === 'ar') ? settings.language : 'he';
  const isRtl = lang !== 'en';
  const dir: 'rtl' | 'ltr' = isRtl ? 'rtl' : 'ltr';

  const t = useCallback((key: string, fallback?: string): string => {
    return getTranslation(lang, key, fallback);
  }, [lang]);

  return useMemo(() => ({
    t,
    lang,
    dir,
    isRtl
  }), [t, lang, dir, isRtl]);
};

export * from './translations';
