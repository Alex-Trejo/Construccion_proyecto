/**
 * @fileoverview Tarjeta Neo-Brutalist reutilizable.
 * @module Card
 */

import type { ReactNode } from 'react';

interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** Color de fondo (clase Tailwind, ej: bg-primary, bg-white, bg-secondary). */
  readonly bg?: string;
}

export function Card({ children, className = '', bg = 'bg-white' }: CardProps) {
  return (
    <div className={`brutal-card-sm ${bg} p-6 ${className}`}>{children}</div>
  );
}
