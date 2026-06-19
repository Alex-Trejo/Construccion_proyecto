/**
 * @fileoverview Puerto — Repositorio de correos recibidos.
 *
 * @module ReceivedEmailRepositoryPort
 */

import { type ReceivedEmail } from '../entities/received-email.entity';

/** Parámetros de paginación (con aislamiento por dueño). */
export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
  readonly ownerId: string | null;
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

  /** Busca un correo por su ID (restringido al dueño) con adjuntos. */
  findById(id: string, ownerId: string | null): Promise<ReceivedEmail | null>;

  /** Dedup por Message-ID dentro del buzón del dueño. */
  existsByMessageId(messageId: string, ownerId: string | null): Promise<boolean>;
}

export const RECEIVED_EMAIL_REPOSITORY_PORT = Symbol(
  'RECEIVED_EMAIL_REPOSITORY_PORT',
);
