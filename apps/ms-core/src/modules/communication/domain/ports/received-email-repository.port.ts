/**
 * @fileoverview Puerto — Repositorio de correos recibidos.
 *
 * @module ReceivedEmailRepositoryPort
 */

import { type ReceivedEmail } from '../entities/received-email.entity';

/** Parámetros de paginación. */
export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
}

/** Resultado paginado de correos. */
export interface PaginatedEmails {
  readonly data: ReadonlyArray<ReceivedEmail>;
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface ReceivedEmailRepositoryPort {
  /** Guarda un nuevo correo recibido con sus adjuntos. */
  save(email: ReceivedEmail): Promise<ReceivedEmail>;

  /** Lista correos con paginación, ordenados por fecha desc. */
  findPaginated(params: PaginationParams): Promise<PaginatedEmails>;

  /** Busca un correo por su ID con adjuntos incluidos. */
  findById(id: string): Promise<ReceivedEmail | null>;

  /** Verifica si ya existe un correo por su Message-ID (deduplicación). */
  existsByMessageId(messageId: string): Promise<boolean>;
}

export const RECEIVED_EMAIL_REPOSITORY_PORT = Symbol(
  'RECEIVED_EMAIL_REPOSITORY_PORT',
);
