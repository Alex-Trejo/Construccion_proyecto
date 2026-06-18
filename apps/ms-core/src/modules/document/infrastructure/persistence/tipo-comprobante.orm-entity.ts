/**
 * @fileoverview Entidad ORM — Tipo de Comprobante (Catálogo).
 *
 * Tabla: tipo_comprobantes
 * Catálogo de tipos de comprobantes electrónicos del SRI.
 * Cumple el requisito del diagrama ER de la rúbrica.
 *
 * Valores esperados:
 *   1 - Factura
 *   2 - Nota de Crédito
 *   3 - Nota de Débito
 *   4 - Comprobante de Retención
 *   5 - Guía de Remisión
 *
 * @module TipoComprobanteOrmEntity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('tipo_comprobantes')
export class TipoComprobanteOrmEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('idx_tipo_comprobantes_codigo', { unique: true })
  @Column({ name: 'codigo_sri', type: 'varchar', length: 2, unique: true })
  codigoSri!: string;

  @Column({ name: 'nombre_tipo_comprobante', type: 'varchar', length: 100 })
  nombreTipoComprobante!: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 500, nullable: true })
  descripcion!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
