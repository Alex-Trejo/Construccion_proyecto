/**
 * @fileoverview Schema TypeORM — Adjunto de Correo Electrónico.
 *
 * Define la entidad de persistencia para la tabla `email_attachments`.
 * Relación ManyToOne con `received_emails`.
 *
 * @module EmailAttachmentSchema
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReceivedEmailOrmEntity } from './received-email.orm-entity';

@Entity('email_attachments')
export class EmailAttachmentOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'received_email_id', type: 'uuid' })
  receivedEmailId!: string;

  @Column({ name: 'filename', type: 'varchar', length: 500 })
  filename!: string;

  @Column({ name: 'extension', type: 'varchar', length: 10 })
  extension!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 100 })
  contentType!: string;

  @Column({ name: 'size', type: 'integer' })
  size!: number;

  @Column({ name: 'storage_bucket', type: 'varchar', length: 100 })
  storageBucket!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 1000 })
  storageKey!: string;

  @ManyToOne(
    () => ReceivedEmailOrmEntity,
    (email) => email.attachments,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'received_email_id' })
  receivedEmail!: ReceivedEmailOrmEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
