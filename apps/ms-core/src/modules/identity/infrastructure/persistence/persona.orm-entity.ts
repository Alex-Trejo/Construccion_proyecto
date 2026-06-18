/**
 * @fileoverview Entidad ORM — Persona (Shadow Table de Keycloak).
 *
 * Tabla: personas
 * Refleja los datos personales (nombre, apellido, cédula) de los
 * usuarios de Keycloak dentro de sgc_db.
 *
 * Relación: PERSONA 1 ──── 1 USUARIO
 *
 * @module PersonaOrmEntity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('personas')
export class PersonaOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_personas_cedula', { unique: true })
  @Column({ name: 'cedula', type: 'varchar', length: 13, unique: true, nullable: true })
  cedula!: string | null;

  @Column({ name: 'nombres', type: 'varchar', length: 200 })
  nombres!: string;

  @Column({ name: 'apellidos', type: 'varchar', length: 200 })
  apellidos!: string;

  @Index('idx_personas_email', { unique: true })
  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true, unique: true })
  email!: string | null;

  @Column({ name: 'telefono', type: 'varchar', length: 50, nullable: true })
  telefono!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
