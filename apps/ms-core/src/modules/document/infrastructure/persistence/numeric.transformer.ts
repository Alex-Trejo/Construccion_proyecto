/**
 * @fileoverview Transformer para columnas numeric/decimal → number en JS.
 * (TypeORM devuelve los decimales como string por defecto.)
 * @module numeric.transformer
 */

export const numericTransformer = {
  to: (value: number): number => value,
  from: (value: string | null): number =>
    value === null || value === undefined ? 0 : parseFloat(value),
};
