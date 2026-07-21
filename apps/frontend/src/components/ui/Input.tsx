/**
 * @fileoverview Input Neo-Brutalist reutilizable (`.brutal-input`).
 * @module ui/Input
 */

import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={`brutal-input ${className}`} {...rest} />;
});
