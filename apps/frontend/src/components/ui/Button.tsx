/**
 * @fileoverview Botón Neo-Brutalist reutilizable.
 * Usa las utilidades `.brutal-btn*` definidas en globals.css.
 * @module Button
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'dark' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly children: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'brutal-btn-primary',
  dark: 'brutal-btn-dark',
  secondary: 'brutal-btn-secondary',
};

export function Button({
  variant = 'primary',
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`brutal-btn ${VARIANT_CLASS[variant]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
