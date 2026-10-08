import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SupportedLocale, SUPPORTED_LANGUAGES, LanguageOption, translations } from '../locales';

interface LanguageContextType {
  locale: SupportedLocale;
  setLanguage: (lang: SupportedLocale) => void;
  setLocale: (lang: SupportedLocale) => void;
  languages: LanguageOption[];
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (dateStr: string) => string;
  formatEventType: (rawType: string) => string;
}

const STORAGE_KEY = 'bekis_studio_locale';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale;
    if (saved && (saved === 'en' || saved === 'am' || saved === 'ti' || saved === 'om')) {
      return saved;
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: SupportedLocale) => {
    setLocaleState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('lang', locale);
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const activeDict = translations[locale] || translations.en;
      let text = activeDict[key] || translations.en[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }

      return text;
    },
    [locale]
  );

  const formatEventType = useCallback(
    (rawType: string): string => {
      if (!rawType) return t('eventTypes.other') || t('event.other');
      const normalized = rawType.toLowerCase();

      if (normalized.includes('wedding')) return t('eventTypes.wedding') || t('event.wedding');
      if (normalized.includes('engagement') || normalized.includes('kaadhimmannaa')) return t('eventTypes.engagement') || t('event.engagement');
      if (normalized.includes('birthday')) return t('eventTypes.birthday') || t('event.birthday');
      if (normalized.includes('corporate')) return t('eventTypes.corporate') || t('event.corporate');
      if (normalized.includes('graduation')) return t('eventTypes.graduation') || 'Graduation';
      if (normalized.includes('baby') || normalized.includes('shower')) return t('eventTypes.babyShower') || 'Baby Shower';
      if (normalized.includes('concert')) return t('eventTypes.concert') || 'Concert';
      if (normalized.includes('gala')) return t('eventTypes.gala') || t('event.gala');
      if (normalized.includes('anniversary')) return t('eventTypes.anniversary') || t('event.anniversary');
      if (normalized.includes('celebration')) return t('eventTypes.celebration') || t('event.celebration');

      return rawType;
    },
    [t]
  );

  const formatDate = useCallback(
    (dateStr: string): string => {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const day = d.getDate();
        const year = d.getFullYear();

        if (locale === 'am') {
          const amharicMonths = [
            'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ',
            'ሐምሌ', 'ነሐሴ', 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ'
          ];
          return `${amharicMonths[d.getMonth()]} ${day}፣ ${year}`;
        }

        if (locale === 'ti') {
          const tigrinyaMonths = [
            'ጥሪ', 'ለካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰነ',
            'ሓምለ', 'ነሓሰ', 'መስከረም', 'ጥቅምቲ', 'ሕዳር', 'ታሕሳስ'
          ];
          return `${tigrinyaMonths[d.getMonth()]} ${day}፣ ${year}`;
        }

        if (locale === 'om') {
          const oromoMonths = [
            'Amajjii', 'Guraandhala', 'Bitooteessa', 'Elba', 'Caamsaa', 'Waxabajjii',
            'Adooleessa', 'Hagayya', 'Fulbaana', 'Onkololeessa', 'Sadaasa', 'Muddee'
          ];
          return `${day} ${oromoMonths[d.getMonth()]} ${year}`;
        }

        // English default
        const enMonths = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${enMonths[d.getMonth()]} ${day}, ${year}`;
      } catch {
        return dateStr;
      }
    },
    [locale]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLanguage,
        setLocale: setLanguage,
        languages: SUPPORTED_LANGUAGES,
        t,
        formatDate,
        formatEventType,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}

export const useTranslation = useI18n;
