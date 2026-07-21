/**
 * @fileoverview Select Neo-Brutalist reutilizable (`.brutal-select`).
 * @module ui/Select
 */

import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = '', children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`brutal-select ${className}`} {...rest}>
      {children}
    </select>
  );
});
