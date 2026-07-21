/**
 * @fileoverview Badge Neo-Brutalist (`.brutal-badge`) con tonos por color.
 * @module ui/Badge
 */

import type { ReactNode } from 'react';

export type BadgeTone =
  | 'primary'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'dark';

const TONE_CLASS: Record<BadgeTone, string> = {
  primary: 'bg-primary',
  neutral: 'bg-secondary',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)] text-white',
  dark: 'bg-dark text-white',
};

interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
  readonly className?: string;
}

export function Badge({ children, tone = 'primary', className = '' }: BadgeProps) {
  return (
    <span className={`brutal-badge ${TONE_CLASS[tone]} ${className}`}>
      {children}
    </span>
  );
}
