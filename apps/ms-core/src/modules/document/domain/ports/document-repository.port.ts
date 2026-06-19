/**
 * @fileoverview Puerto — Repositorio de Comprobantes (Document).
 * @module DocumentRepositoryPort
 */

import type { ICreateDocumentDto, IDocumentDto } from '@sgc/shared';

export interface DocumentRepositoryPort {
  /** Guarda un comprobante con sus items e impuestos (cascade). */
  save(
    dto: ICreateDocumentDto,
    ownerId: string | null,
    source: string,
  ): Promise<IDocumentDto>;

  /** Listado paginado del dueño (más reciente primero). */
  findPaginated(
    ownerId: string | null,
    page: number,
    limit: number,
  ): Promise<[IDocumentDto[], number]>;

  /** Detalle por id (incluye items e impuestos), restringido al dueño. */
  findById(id: string, ownerId: string | null): Promise<IDocumentDto | null>;

  /** Unicidad estricta: ¿el dueño ya tiene este RUC + número de factura? */
  existsByNumero(
    ownerId: string | null,
    rucEmisor: string,
    numeroFactura: string,
  ): Promise<boolean>;

  /** Referencia de almacenamiento (para Pre-Signed URL), restringida al dueño. */
  getStorageRef(
    id: string,
    ownerId: string | null,
  ): Promise<{ bucket: string; key: string } | null>;
}

export const DOCUMENT_REPOSITORY_PORT = Symbol('DOCUMENT_REPOSITORY_PORT');
