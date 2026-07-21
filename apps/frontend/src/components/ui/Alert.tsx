/**
 * @fileoverview Alerta Neo-Brutalist para feedback (éxito / error / info).
 * @module ui/Alert
 */

import type { ReactNode } from 'react';

export type AlertTone = 'success' | 'error' | 'info' | 'warning';

const TONE_CLASS: Record<AlertTone, string> = {
  success: 'bg-primary',
  error: 'bg-[var(--color-danger)] text-white',
  info: 'bg-secondary',
  warning: 'bg-[var(--color-warning)]',
};

interface AlertProps {
  readonly tone: AlertTone;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Alert({ tone, children, className = '' }: AlertProps) {
  return (
    <div className={`brutal-card-sm p-4 text-sm font-medium ${TONE_CLASS[tone]} ${className}`}>
      {children}
    </div>
  );
}
