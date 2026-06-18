/**
 * @fileoverview Entidad ORM — Company (Empresa Receptora) para PostgreSQL.
 *
 * Tabla: companies
 * Representa la empresa dueña del sistema que recibe comprobantes.
 *
 * @module CompanyOrmEntity
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('companies')
export class CompanyOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index('idx_companies_ruc', { unique: true })
  @Column({ name: 'ruc', type: 'varchar', length: 13, unique: true })
  ruc!: string;

  @Column({ name: 'razon_social', type: 'varchar', length: 300 })
  razonSocial!: string;

  @Column({ name: 'nombre_comercial', type: 'varchar', length: 300, nullable: true })
  nombreComercial!: string | null;

  @Column({ name: 'direccion', type: 'varchar', length: 500, nullable: true })
  direccion!: string | null;

  @Column({ name: 'obligado_llevar_contabilidad', type: 'boolean', default: false })
  obligadoLlevarContabilidad!: boolean;

  @Column({ name: 'regimen', type: 'varchar', length: 50 })
  regimen!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
