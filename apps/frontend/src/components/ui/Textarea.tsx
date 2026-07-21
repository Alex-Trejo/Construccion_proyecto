/**
 * @fileoverview Textarea Neo-Brutalist reutilizable (usa estilo `.brutal-input`).
 * @module ui/Textarea
 */

import { forwardRef, type TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className = '', rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`brutal-input resize-y ${className}`}
        {...rest}
      />
    );
  },
);
