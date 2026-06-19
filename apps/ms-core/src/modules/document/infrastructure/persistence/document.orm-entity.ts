/**
 * @fileoverview Entidad ORM — Comprobante / Documento fiscal.
 *
 * Tabla: documents. Relación 1:N con items (líneas) e impuestos.
 * Aislamiento por `owner_id`. Unicidad estricta (owner_id, ruc_emisor,
 * numero_factura).
 *
 * @module DocumentOrmEntity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DocumentItemOrmEntity } from './document-item.orm-entity';
import { DocumentTaxOrmEntity } from './document-tax.orm-entity';
import { numericTransformer } from './numeric.transformer';

@Entity('documents')
// Unicidad estricta por dueño: un comprobante (RUC + Nº factura) por usuario.
@Index('idx_documents_owner_ruc_num', ['ownerId', 'rucEmisor', 'numeroFactura'], {
  unique: true,
})
export class DocumentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_documents_owner')
  @Column({ name: 'owner_id', type: 'varchar', length: 255, nullable: true })
  ownerId!: string | null;

  @Column({ name: 'document_type', type: 'varchar', length: 30 })
  documentType!: string;

  @Column({ name: 'estado', type: 'varchar', length: 30, default: 'PENDIENTE' })
  estado!: string;

  @Column({ name: 'source', type: 'varchar', length: 30 })
  source!: string;

  @Column({ name: 'ruc_emisor', type: 'varchar', length: 13 })
  rucEmisor!: string;

  @Column({ name: 'razon_social_emisor', type: 'varchar', length: 300, nullable: true })
  razonSocialEmisor!: string | null;

  @Column({ name: 'numero_factura', type: 'varchar', length: 30 })
  numeroFactura!: string;

  @Column({ name: 'clave_acceso', type: 'varchar', length: 49, nullable: true })
  claveAcceso!: string | null;

  @Column({ name: 'fecha_emision', type: 'varchar', length: 30, nullable: true })
  fechaEmision!: string | null;

  @Column({ name: 'subtotal', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: numericTransformer })
  subtotal!: number;

  @Column({ name: 'iva', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: numericTransformer })
  iva!: number;

  @Column({ name: 'total', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: numericTransformer })
  total!: number;

  // Archivo original (imagen/PDF) en MinIO.
  @Column({ name: 'storage_bucket', type: 'varchar', length: 100, nullable: true })
  storageBucket!: string | null;

  @Column({ name: 'storage_key', type: 'varchar', length: 500, nullable: true })
  storageKey!: string | null;

  @OneToMany(() => DocumentItemOrmEntity, (i) => i.document, {
    cascade: true,
    eager: true,
  })
  items!: DocumentItemOrmEntity[];

  @OneToMany(() => DocumentTaxOrmEntity, (t) => t.document, {
    cascade: true,
    eager: true,
  })
  taxes!: DocumentTaxOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
