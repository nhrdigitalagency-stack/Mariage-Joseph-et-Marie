import React, { createContext, useContext, useState, useEffect } from 'react';
import fr from './fr.json';
import en from './en.json';

export type Language = 'fr' | 'en';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof fr;
  formatDate: (isoString: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('jm_wedding_lang');
      if (saved === 'en' || saved === 'fr') return saved;
    } catch {
      // ignore storage errors
    }
    return 'fr';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('jm_wedding_lang', newLang);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Africa/Douala',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const t = lang === 'fr' ? fr : en;

  return (
    <I18nContext.Provider value={{ lang, setLang, t, formatDate }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
