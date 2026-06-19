/**
 * @fileoverview Puerto — Repositorio de configuración IMAP por usuario.
 * @module ImapConfigRepositoryPort
 */

import type { IImapConfigDto, IImapActiveConfig } from '@sgc/shared';

export interface UpsertImapConfig {
  readonly ownerId: string;
  readonly host: string;
  readonly port: number;
  readonly email: string;
  readonly passwordEncrypted: string;
  readonly tls: boolean;
}

export interface ImapConfigRepositoryPort {
  /** Crea o actualiza la config IMAP del usuario (1 por dueño). */
  upsert(data: UpsertImapConfig): Promise<IImapConfigDto>;
  /** Configs activas con password CIFRADO (para ms-sync). */
  listActive(): Promise<IImapActiveConfig[]>;
}

export const IMAP_CONFIG_REPOSITORY_PORT = Symbol('IMAP_CONFIG_REPOSITORY_PORT');
