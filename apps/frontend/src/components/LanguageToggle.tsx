/**
 * @fileoverview Selector de idioma ES/EN (client).
 * Botón segmentado que alterna el idioma activo del provider i18n.
 * @module LanguageToggle
 */

'use client';

import { useTranslation } from '@/lib/i18n/language-provider';
import type { Lang } from '@/lib/i18n/dictionaries';

const OPTIONS: ReadonlyArray<Lang> = ['es', 'en'];

export function LanguageToggle() {
  const { lang, setLang, t } = useTranslation();

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border-2 border-black bg-white p-0.5"
      role="group"
      aria-label={t('common.language')}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setLang(opt)}
          aria-pressed={lang === opt}
          className={`rounded-md px-2 py-1 text-xs font-bold uppercase transition ${
            lang === opt ? 'bg-primary' : 'hover:bg-secondary'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
