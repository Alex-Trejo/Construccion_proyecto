/**
 * @fileoverview Entidad ORM — Supplier (Proveedor) para PostgreSQL.
 *
 * Tabla: suppliers
 * Usa Single Table Inheritance para PersonaNatural y PersonaJuridica.
 *
 * @module SupplierOrmEntity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('suppliers')
// Unicidad por dueño: cada usuario puede tener su propio proveedor con un RUC.
@Index('idx_suppliers_owner_ruc', ['ownerId', 'ruc'], { unique: true })
export class SupplierOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  // Dueño del registro (userId/keycloak sub) — aislamiento multi-tenant.
  @Index('idx_suppliers_owner')
  @Column({ name: 'owner_id', type: 'varchar', length: 255, nullable: true })
  ownerId!: string | null;

  @Column({ name: 'supplier_code', type: 'varchar', length: 20 })
  supplierCode!: string;

  @Column({ name: 'supplier_type', type: 'varchar', length: 30 })
  supplierType!: string;

  @Column({ name: 'ruc', type: 'varchar', length: 13 })
  ruc!: string;

  @Column({ name: 'razon_social', type: 'varchar', length: 300 })
  razonSocial!: string;

  @Column({ name: 'nombre_comercial', type: 'varchar', length: 300, nullable: true })
  nombreComercial!: string | null;

  // ── Campos específicos Persona Natural ───────────────────────────────────
  @Column({ name: 'first_name', type: 'varchar', length: 150, nullable: true })
  firstName!: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 150, nullable: true })
  lastName!: string | null;

  @Column({ name: 'cedula', type: 'varchar', length: 10, nullable: true })
  cedula!: string | null;

  // ── Campos específicos Persona Jurídica ──────────────────────────────────
  @Column({ name: 'legal_representative', type: 'varchar', length: 300, nullable: true })
  legalRepresentative!: string | null;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ name: 'address', type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ name: 'obligado_contabilidad', type: 'boolean', default: false })
  obligadoContabilidad!: boolean;

  @Column({ name: 'regimen', type: 'varchar', length: 50, nullable: true })
  regimen!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
