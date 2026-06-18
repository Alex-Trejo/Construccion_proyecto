/**
 * @fileoverview Entidad ORM — Usuario (Shadow Table de Keycloak).
 *
 * Tabla: usuarios
 * Puente entre Keycloak (autenticación externa) y el dominio del SI.
 * Almacena el keycloak_id para vincular el JWT con la persona y el rol
 * dentro de sgc_db.
 *
 * Relaciones:
 *   PERSONA 1 ──── 1 USUARIO
 *   ROL     1 ──── N USUARIO
 *
 * @module UsuarioOrmEntity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PersonaOrmEntity } from './persona.orm-entity';
import { RolOrmEntity } from './rol.orm-entity';

@Entity('usuarios')
export class UsuarioOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_usuarios_keycloak_id', { unique: true })
  @Column({ name: 'keycloak_id', type: 'varchar', length: 255, unique: true })
  keycloakId!: string;

  @Column({ name: 'username', type: 'varchar', length: 150 })
  username!: string;

  @Column({ name: 'id_persona', type: 'uuid' })
  idPersona!: string;

  @Column({ name: 'id_rol', type: 'uuid' })
  idRol!: string;

  @Column({ name: 'estado', type: 'boolean', default: true })
  estado!: boolean;

  @Column({ name: 'ultimo_acceso', type: 'timestamptz', nullable: true })
  ultimoAcceso!: Date | null;

  @ManyToOne(() => PersonaOrmEntity, { eager: true })
  @JoinColumn({ name: 'id_persona' })
  persona!: PersonaOrmEntity;

  @ManyToOne(() => RolOrmEntity, { eager: true })
  @JoinColumn({ name: 'id_rol' })
  rol!: RolOrmEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
