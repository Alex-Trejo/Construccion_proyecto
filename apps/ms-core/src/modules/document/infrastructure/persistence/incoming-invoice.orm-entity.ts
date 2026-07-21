/**
 * @fileoverview Entidad ORM — IncomingInvoice (Staging de Facturas) para PostgreSQL.
 *
 * Tabla: incoming_invoices
 * Cola de trabajo para el procesamiento de comprobantes del SRI.
 *
 * @module IncomingInvoiceOrmEntity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('incoming_invoices')
export class IncomingInvoiceOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index('idx_incoming_invoices_clave_acceso', { unique: true })
  @Column({ name: 'clave_acceso', type: 'varchar', length: 49, unique: true })
  claveAcceso!: string;

  @Index('idx_incoming_invoices_estado')
  @Column({ name: 'estado', type: 'varchar', length: 30 })
  estado!: string;

  @Index('idx_incoming_invoices_owner')
  @Column({ name: 'owner_id', type: 'varchar', length: 255, nullable: true })
  ownerId!: string | null;

  @Column({ name: 'origen', type: 'varchar', length: 20 })
  origen!: string;

  @Column({ name: 'xml_crudo', type: 'text', nullable: true })
  xmlCrudo!: string | null;

  @Column({ name: 'xml_limpio', type: 'text', nullable: true })
  xmlLimpio!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'intentos', type: 'integer', default: 0 })
  intentos!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
