/**
 * @fileoverview Adaptador TypeORM — Repositorio de correos recibidos.
 *
 * Implementa ReceivedEmailRepositoryPort usando TypeORM Repository.
 * Mapea entre entidades de dominio y schemas de persistencia.
 *
 * @module ReceivedEmailTypeOrmAdapter
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, type FindOptionsWhere } from 'typeorm';

import {
  type ReceivedEmailRepositoryPort,
  type PaginationParams,
  type PaginatedEmails,
} from '../../domain/ports/received-email-repository.port';
import { ReceivedEmail } from '../../domain/entities/received-email.entity';
import { EmailAttachmentEntity } from '../../domain/entities/email-attachment.entity';
import { ReceivedEmailOrmEntity } from './received-email.orm-entity';
import { EmailAttachmentOrmEntity } from './email-attachment.orm-entity';

@Injectable()
export class TypeOrmReceivedEmailRepository implements ReceivedEmailRepositoryPort {
  private readonly logger = new Logger(TypeOrmReceivedEmailRepository.name);

  constructor(
    @InjectRepository(ReceivedEmailOrmEntity)
    private readonly emailRepository: Repository<ReceivedEmailOrmEntity>,
  ) {}

  async save(email: ReceivedEmail): Promise<ReceivedEmail> {
    const schema = this.toSchema(email);
    const saved = await this.emailRepository.save(schema);
    this.logger.debug(`Correo guardado: ${saved.id}`);
    return this.toDomain(saved);
  }

  /** Predicado de dueño (maneja null = sistema). */
  private owner(ownerId: string | null): string | ReturnType<typeof IsNull> {
    return ownerId === null ? IsNull() : ownerId;
  }

  async findPaginated(params: PaginationParams): Promise<PaginatedEmails> {
    const { page, limit, ownerId } = params;
    const skip = (page - 1) * limit;

    const [schemas, total] = await this.emailRepository.findAndCount({
      where: { ownerId: this.owner(ownerId) } as FindOptionsWhere<ReceivedEmailOrmEntity>,
      order: { emailDate: 'DESC' },
      skip,
      take: limit,
      relations: ['attachments'],
    });

    return {
      data: schemas.map((s) => this.toDomain(s)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, ownerId: string | null): Promise<ReceivedEmail | null> {
    const schema = await this.emailRepository.findOne({
      where: { id, ownerId: this.owner(ownerId) } as FindOptionsWhere<ReceivedEmailOrmEntity>,
      relations: ['attachments'],
    });

    if (!schema) return null;
    return this.toDomain(schema);
  }

  async existsByMessageId(
    messageId: string,
    ownerId: string | null,
  ): Promise<boolean> {
    const count = await this.emailRepository.count({
      where: {
        emailMessageId: messageId,
        ownerId: this.owner(ownerId),
      } as FindOptionsWhere<ReceivedEmailOrmEntity>,
    });
    return count > 0;
  }

  // ── Mappers: Domain ↔ Schema ─────────────────────────────────────────────

  private toSchema(domain: ReceivedEmail): ReceivedEmailOrmEntity {
    const schema = new ReceivedEmailOrmEntity();
    schema.id = domain.id;
    schema.ownerId = domain.ownerId;
    schema.emailFrom = domain.emailFrom;
    schema.emailSubject = domain.emailSubject;
    schema.emailDate = domain.emailDate;
    schema.emailMessageId = domain.emailMessageId;
    schema.createdAt = domain.createdAt;
    schema.attachments = domain.attachments.map((a) => {
      const attSchema = new EmailAttachmentOrmEntity();
      attSchema.id = a.id;
      attSchema.receivedEmailId = a.receivedEmailId;
      attSchema.filename = a.filename;
      attSchema.extension = a.extension;
      attSchema.contentType = a.contentType;
      attSchema.size = a.size;
      attSchema.storageBucket = a.storageBucket;
      attSchema.storageKey = a.storageKey;
      attSchema.createdAt = a.createdAt;
      return attSchema;
    });
    return schema;
  }

  private toDomain(schema: ReceivedEmailOrmEntity): ReceivedEmail {
    const attachments = (schema.attachments ?? []).map(
      (a) =>
        new EmailAttachmentEntity({
          id: a.id,
          receivedEmailId: a.receivedEmailId,
          filename: a.filename,
          extension: a.extension,
          contentType: a.contentType,
          size: a.size,
          storageBucket: a.storageBucket,
          storageKey: a.storageKey,
          createdAt: a.createdAt,
        }),
    );

    return new ReceivedEmail({
      id: schema.id,
      ownerId: schema.ownerId,
      emailFrom: schema.emailFrom,
      emailSubject: schema.emailSubject,
      emailDate: schema.emailDate,
      emailMessageId: schema.emailMessageId,
      attachments,
      createdAt: schema.createdAt,
    });
  }
}
