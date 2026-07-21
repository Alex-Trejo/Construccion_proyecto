/**
 * @fileoverview Entidad ORM — Impuesto de un comprobante.
 * Tabla: document_taxes (N por documento).
 * @module DocumentTaxOrmEntity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DocumentOrmEntity } from './document.orm-entity';
import { numericTransformer } from './numeric.transformer';

@Entity('document_taxes')
export class DocumentTaxOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_document_taxes_document')
  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @ManyToOne(() => DocumentOrmEntity, (d) => d.taxes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document!: DocumentOrmEntity;

  /** Código del impuesto (ej: IVA, ICE, IRBPNR). */
  @Column({ name: 'codigo', type: 'varchar', length: 20 })
  codigo!: string;

  /** Tarifa (%) aplicada (ej: 15). */
  @Column({ name: 'tarifa', type: 'numeric', precision: 6, scale: 2, default: 0, transformer: numericTransformer })
  tarifa!: number;

  @Column({ name: 'base_imponible', type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  baseImponible!: number;

  @Column({ name: 'valor', type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  valor!: number;
}
