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
