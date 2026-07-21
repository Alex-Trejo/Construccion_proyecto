/**
 * @fileoverview Casos de uso — Configuración IMAP por usuario.
 * @module ImapConfigUseCases
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import type {
  ICreateImapConfigDto,
  IImapConfigDto,
  IImapActiveConfig,
  IImapTestResultDto,
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

@Injectable()
export class GetImapConfigUseCase {
  constructor(
    @Inject(IMAP_CONFIG_REPOSITORY_PORT)
    private readonly repo: ImapConfigRepositoryPort,
  ) {}

  /** Config del usuario (sin password) o null si aún no configuró su buzón. */
  execute(ownerId: string): Promise<IImapConfigDto | null> {
    return this.repo.findByOwner(ownerId);
  }
}

@Injectable()
export class DeleteImapConfigUseCase {
  constructor(
    @Inject(IMAP_CONFIG_REPOSITORY_PORT)
    private readonly repo: ImapConfigRepositoryPort,
  ) {}

  /** Elimina la config del usuario. Devuelve true si existía. */
  execute(ownerId: string): Promise<boolean> {
    return this.repo.deleteByOwner(ownerId);
  }
}

@Injectable()
export class SetImapActiveUseCase {
  constructor(
    @Inject(IMAP_CONFIG_REPOSITORY_PORT)
    private readonly repo: ImapConfigRepositoryPort,
  ) {}

  /** Pausa/activa el escaneo del buzón del usuario. */
  execute(ownerId: string, isActive: boolean): Promise<IImapConfigDto | null> {
    return this.repo.setActive(ownerId, isActive);
  }
}

@Injectable()
export class TestImapConnectionUseCase {
  private readonly logger = new Logger(TestImapConnectionUseCase.name);

  /**
   * Intenta un login IMAP real (connect + logout) con las credenciales dadas
   * y devuelve un resultado legible. No persiste nada. Clasifica el fallo
   * (autenticación / host / red) para dar un mensaje útil al usuario.
   */
  async execute(dto: ICreateImapConfigDto): Promise<IImapTestResultDto> {
    const client = new ImapFlow({
      host: dto.host,
      port: dto.port,
      secure: dto.tls ?? true,
      auth: { user: dto.email, pass: dto.password },
      logger: false,
      // No colgar la UI: un timeout corto para el test.
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
    });

    try {
      await client.connect();
      await client.logout();
      return { ok: true, message: `Conexión exitosa a ${dto.host} (${dto.email}).` };
    } catch (error) {
      const message = this.classify(error);
      this.logger.warn(`Test IMAP falló (${dto.email}): ${message}`);
      // Cierre defensivo por si quedó a medias.
      try {
        await client.logout();
      } catch {
        /* ignorado */
      }
      return { ok: false, message };
    }
  }

  /** Traduce el error crudo de imapflow/red a un mensaje accionable. */
  private classify(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';

    if (/AUTHENTICATIONFAILED|Invalid credentials|LOGIN failed|authentication/i.test(raw)) {
      return 'Autenticación rechazada. Verifica el correo y usa una Contraseña de Aplicación (App Password), no la contraseña normal.';
    }
    if (code === 'ENOTFOUND' || /ENOTFOUND|getaddrinfo/i.test(raw)) {
      return 'No se encontró el servidor. Revisa el host IMAP (p. ej. imap.gmail.com).';
    }
    if (code === 'ECONNREFUSED' || /ECONNREFUSED/i.test(raw)) {
      return 'Conexión rechazada. Revisa el puerto (normalmente 993 con TLS).';
    }
    if (code === 'ETIMEDOUT' || /timeout|ETIMEDOUT/i.test(raw)) {
      return 'Tiempo de espera agotado. Revisa el host/puerto y que el servidor permita IMAP.';
    }
    return `No se pudo conectar: ${raw}`;
  }
}
