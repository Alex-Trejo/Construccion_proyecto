/**
 * @fileoverview Tabla Neo-Brutalist reutilizable (`.brutal-table`).
 *
 * Renderiza el contenedor con scroll horizontal, el `thead` a partir de
 * `headers`, y estados de carga/vacío. Las filas van como `children` (tbody).
 *
 * @module ui/Table
 */

import type { ReactNode } from 'react';

interface TableProps {
  readonly headers: ReadonlyArray<string>;
  readonly children: ReactNode;
  readonly loading?: boolean;
  readonly isEmpty?: boolean;
  readonly loadingText?: string;
  readonly emptyText?: string;
}

export function Table({
  headers,
  children,
  loading = false,
  isEmpty = false,
  loadingText = '…',
  emptyText = '—',
}: TableProps) {
  return (
    <div className="brutal-card overflow-x-auto bg-white p-2">
      <table className="brutal-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length}>{loadingText}</td>
            </tr>
          ) : isEmpty ? (
            <tr>
              <td colSpan={headers.length}>{emptyText}</td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
