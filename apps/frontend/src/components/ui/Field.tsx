/**
 * @fileoverview Campo de formulario — label + control + ayuda/errores opcionales.
 * @module ui/Field
 */

import type { ReactNode } from 'react';

interface FieldProps {
  readonly label: string;
  readonly children: ReactNode;
  /** Texto de ayuda (hint) bajo el control. */
  readonly hint?: ReactNode;
  readonly required?: boolean;
}

export function Field({ label, children, hint, required }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">
        {label}
        {required && <span className="text-[var(--color-danger)]"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-dark/60">{hint}</span>}
    </label>
  );
}
