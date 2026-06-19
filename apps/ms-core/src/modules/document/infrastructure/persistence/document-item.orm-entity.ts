/**
 * @fileoverview Entidad ORM — Ítem de un comprobante (líneas de detalle).
 * Tabla: document_items (N por documento).
 * @module DocumentItemOrmEntity
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

@Entity('document_items')
export class DocumentItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_document_items_document')
  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @ManyToOne(() => DocumentOrmEntity, (d) => d.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document!: DocumentOrmEntity;

  @Column({ name: 'descripcion', type: 'varchar', length: 500 })
  descripcion!: string;

  @Column({ name: 'cantidad', type: 'numeric', precision: 14, scale: 4, transformer: numericTransformer })
  cantidad!: number;

  @Column({ name: 'precio_unitario', type: 'numeric', precision: 14, scale: 4, transformer: numericTransformer })
  precioUnitario!: number;

  @Column({ name: 'descuento', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: numericTransformer })
  descuento!: number;

  @Column({ name: 'total', type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  total!: number;
}
