/**
 * @fileoverview Adaptador TypeORM — Configuración IMAP por usuario.
 * @module TypeOrmImapConfigRepository
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IImapConfigDto, IImapActiveConfig } from '@sgc/shared';

import {
  type ImapConfigRepositoryPort,
  type UpsertImapConfig,
} from '../../domain/ports/imap-config.repository.port';
import { ImapConfigOrmEntity } from './imap-config.orm-entity';

@Injectable()
export class TypeOrmImapConfigRepository implements ImapConfigRepositoryPort {
  constructor(
    @InjectRepository(ImapConfigOrmEntity)
    private readonly repo: Repository<ImapConfigOrmEntity>,
  ) {}

  async upsert(data: UpsertImapConfig): Promise<IImapConfigDto> {
    let entity = await this.repo.findOne({ where: { ownerId: data.ownerId } });
    if (!entity) {
      entity = this.repo.create({ ...data, isActive: true });
    } else {
      entity.host = data.host;
      entity.port = data.port;
      entity.email = data.email;
      entity.passwordEncrypted = data.passwordEncrypted;
      entity.tls = data.tls;
      entity.isActive = true;
    }
    const saved = await this.repo.save(entity);
    return {
      id: saved.id,
      host: saved.host,
      port: saved.port,
      email: saved.email,
      tls: saved.tls,
      isActive: saved.isActive,
    };
  }

  async listActive(): Promise<IImapActiveConfig[]> {
    const rows = await this.repo.find({ where: { isActive: true } });
    return rows.map((r) => ({
      ownerId: r.ownerId,
      host: r.host,
      port: r.port,
      email: r.email,
      tls: r.tls,
      passwordEncrypted: r.passwordEncrypted,
    }));
  }
}
