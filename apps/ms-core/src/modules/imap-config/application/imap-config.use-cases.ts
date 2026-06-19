/**
 * @fileoverview Casos de uso — Configuración IMAP por usuario.
 * @module ImapConfigUseCases
 */

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ICreateImapConfigDto,
  IImapConfigDto,
  IImapActiveConfig,
} from '@sgc/shared';

import { encryptSecret } from '../../../common/crypto.util';
import {
  type ImapConfigRepositoryPort,
  IMAP_CONFIG_REPOSITORY_PORT,
} from '../domain/ports/imap-config.repository.port';

@Injectable()
export class SaveImapConfigUseCase {
  private readonly encryptionKey: string;

  constructor(
    @Inject(IMAP_CONFIG_REPOSITORY_PORT)
    private readonly repo: ImapConfigRepositoryPort,
    config: ConfigService,
  ) {
    this.encryptionKey = config.getOrThrow<string>('ENCRYPTION_KEY');
  }

  async execute(
    dto: ICreateImapConfigDto,
    ownerId: string,
  ): Promise<IImapConfigDto> {
    // La contraseña se cifra ANTES de persistir (nunca en claro).
    const passwordEncrypted = encryptSecret(dto.password, this.encryptionKey);
    return this.repo.upsert({
      ownerId,
      host: dto.host,
      port: dto.port,
      email: dto.email,
      passwordEncrypted,
      tls: dto.tls ?? true,
    });
  }
}

@Injectable()
export class ListActiveImapConfigsUseCase {
  constructor(
    @Inject(IMAP_CONFIG_REPOSITORY_PORT)
    private readonly repo: ImapConfigRepositoryPort,
  ) {}

  /** Devuelve las configs activas con el password CIFRADO (ms-sync descifra). */
  execute(): Promise<IImapActiveConfig[]> {
    return this.repo.listActive();
  }
}
