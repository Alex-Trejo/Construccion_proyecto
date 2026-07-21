/**
 * @fileoverview Paginación Neo-Brutalist reutilizable.
 * Muestra el total/página y botones anterior/siguiente. i18n vía `pagination.*`.
 * @module ui/Pagination
 */

'use client';

import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/language-provider';

interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
  readonly disabled?: boolean;
  readonly onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  disabled = false,
  onPageChange,
}: PaginationProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-dark/60">
        {t('pagination.info', { total, page, totalPages })}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          {t('pagination.prev')}
        </Button>
        <Button
          variant="secondary"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('pagination.next')}
        </Button>
      </div>
    </div>
  );
}
