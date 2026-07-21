/**
 * @fileoverview Entidad ORM — Configuración IMAP por usuario.
 *
 * Tabla: imap_configs. Una config por usuario (owner_id único). La contraseña
 * se guarda CIFRADA (AES-256-GCM); nunca en claro.
 *
 * @module ImapConfigOrmEntity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('imap_configs')
export class ImapConfigOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_imap_configs_owner', { unique: true })
  @Column({ name: 'owner_id', type: 'varchar', length: 255 })
  ownerId!: string;

  @Column({ name: 'host', type: 'varchar', length: 255 })
  host!: string;

  @Column({ name: 'port', type: 'integer' })
  port!: number;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email!: string;

  /** Contraseña cifrada (ivHex:tagHex:dataHex). */
  @Column({ name: 'password_encrypted', type: 'text' })
  passwordEncrypted!: string;

  @Column({ name: 'tls', type: 'boolean', default: true })
  tls!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
