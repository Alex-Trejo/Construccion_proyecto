/**
 * @fileoverview Provider de idioma (i18n) — Context de React ligero.
 *
 * Mantiene el idioma activo (`es`/`en`), lo persiste en `localStorage`
 * (`sgc.lang`) y refleja el valor en `<html lang>`. Expone `t(clave, vars)`
 * para traducir con interpolación `{variable}`.
 *
 * Se eligió un Context propio (sin librerías de enrutado) por la advertencia
 * de `apps/frontend/AGENTS.md`: esta es una versión modificada de Next.js.
 *
 * @module i18n/language-provider
 */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { dictionaries, type Lang } from './dictionaries';

const STORAGE_KEY = 'sgc.lang';
const DEFAULT_LANG: Lang = 'es';

interface LanguageContextValue {
  readonly lang: Lang;
  readonly setLang: (lang: Lang) => void;
  readonly t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Carga la preferencia persistida al montar (solo cliente).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(stored);
    }
  }, []);

  // Refleja el idioma en <html lang> y lo persiste.
  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[lang];
      let text = dict[key] ?? dictionaries.es[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Hook para acceder al idioma activo y al traductor `t`. */
export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation debe usarse dentro de <LanguageProvider>');
  }
  return ctx;
}
