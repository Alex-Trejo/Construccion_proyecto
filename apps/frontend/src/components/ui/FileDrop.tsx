/**
 * @fileoverview Selector de archivo Neo-Brutalist (click o arrastrar-soltar).
 * Devuelve el File seleccionado vía onFile. Sin dependencias externas.
 * @module ui/FileDrop
 */

'use client';

import { useRef, useState, type DragEvent } from 'react';

interface FileDropProps {
  readonly accept?: string;
  readonly label: string;
  readonly hint?: string;
  readonly file: File | null;
  readonly onFile: (file: File | null) => void;
  readonly disabled?: boolean;
}

export function FileDrop({
  accept,
  label,
  hint,
  file,
  onFile,
  disabled = false,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped) onFile(dropped);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`brutal-card-sm flex w-full flex-col items-center gap-2 p-6 text-center transition disabled:opacity-50 ${
          dragOver ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <span className="text-3xl">📄</span>
        <span className="font-semibold">{file ? file.name : label}</span>
        {hint && !file && <span className="text-xs text-dark/60">{hint}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
