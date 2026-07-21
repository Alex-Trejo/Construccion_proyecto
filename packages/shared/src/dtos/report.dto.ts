/**
 * @fileoverview DTOs para reportes / KPIs del dashboard.
 * @module report.dto
 */

export interface IMetricByEstado {
  readonly estado: string;
  readonly cantidad: number;
  readonly total: number;
}

export interface IMetricByMes {
  /** Mes en formato YYYY-MM. */
  readonly mes: string;
  readonly cantidad: number;
  readonly total: number;
}

/** KPIs financieros del dashboard (del usuario autenticado). */
export interface IDashboardMetrics {
  readonly totalGastado: number;
  readonly totalComprobantes: number;
  readonly porEstado: ReadonlyArray<IMetricByEstado>;
  readonly porMes: ReadonlyArray<IMetricByMes>;
}

/**
 * Filtros opcionales para KPIs y exportación (RF07/RF08).
 * `desde`/`hasta`: fecha de emisión en formato YYYY-MM-DD (comparación lexical).
 * `documentType`: valor del enum DocumentType (FACTURA, NOTA_CREDITO, …).
 */
export interface IDashboardFilters {
  readonly desde?: string;
  readonly hasta?: string;
  readonly documentType?: string;
}
