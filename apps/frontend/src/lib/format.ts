/**
 * @fileoverview Utilidades de formato y mapeos de presentación compartidos
 * entre los módulos de Documentos y Dashboard.
 * @module format
 */

import { DocumentStatus } from '@sgc/shared';
import type { BadgeTone } from '@/components/ui/Badge';

/** Formatea un número como moneda USD (SRI Ecuador usa USD). */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(Number.isFinite(value) ? value : 0);
}

/** Formatea una fecha ISO (o null) a formato local corto. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** Mapea el estado de un documento a un tono de Badge. */
export function statusTone(estado: string): BadgeTone {
  switch (estado) {
    case DocumentStatus.VALIDADO:
    case DocumentStatus.CONSOLIDADO:
      return 'success';
    case DocumentStatus.PENDIENTE:
    case DocumentStatus.EN_VALIDACION:
      return 'warning';
    case DocumentStatus.INCONSISTENTE:
    case DocumentStatus.RECHAZADO:
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Clase de color de barra para KPIs por estado. */
export function statusBarClass(estado: string): string {
  switch (estado) {
    case DocumentStatus.VALIDADO:
    case DocumentStatus.CONSOLIDADO:
      return 'bg-[var(--color-success)]';
    case DocumentStatus.PENDIENTE:
    case DocumentStatus.EN_VALIDACION:
      return 'bg-[var(--color-warning)]';
    case DocumentStatus.INCONSISTENTE:
    case DocumentStatus.RECHAZADO:
      return 'bg-[var(--color-danger)]';
    default:
      return 'bg-primary';
  }
}
