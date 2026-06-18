/**
 * @fileoverview Entidad ORM — Rol (Shadow Table de Keycloak).
 *
 * Tabla: roles
 * Refleja los roles definidos en Keycloak dentro de sgc_db
 * para cumplir el requisito de gestión de personas, usuarios y roles
 * integrado al dominio del SI.
 *
 * @module RolOrmEntity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('roles')
export class RolOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_roles_nombre', { unique: true })
  @Column({ name: 'nombre_rol', type: 'varchar', length: 100, unique: true })
  nombreRol!: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 500, nullable: true })
  descripcion!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
