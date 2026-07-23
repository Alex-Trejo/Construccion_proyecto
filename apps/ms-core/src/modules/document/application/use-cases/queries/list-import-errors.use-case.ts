/**
 * @fileoverview Caso de uso — Listar claves que fallaron al importar del SRI.
 *
 * Devuelve las filas de staging (incoming_invoices) del dueño en estado ERROR,
 * con el mensaje del SRI, para trazabilidad ("qué pasó con las que no se crearon").
 *
 * @module ListImportErrorsUseCase
 */

import { Inject, Injectable } from '@nestjs/common';
import { InvoiceProcessingStatus, type IImportErrorDto } from '@sgc/shared';

import {
  type IncomingInvoiceRepositoryPort,
  INCOMING_INVOICE_REPOSITORY_PORT,
} from '../../../domain/ports/incoming-invoice-repository.port';
import { isRetryable, parseStoredError } from '../../import-error.util';

@Injectable()
export class ListImportErrorsUseCase {
  constructor(
    @Inject(INCOMING_INVOICE_REPOSITORY_PORT)
    private readonly invoiceRepo: IncomingInvoiceRepositoryPort,
  ) {}

  async execute(ownerId: string | null): Promise<IImportErrorDto[]> {
    const rows = await this.invoiceRepo.findByOwnerAndEstado(
      ownerId,
      InvoiceProcessingStatus.ERROR,
    );
    return rows.map((r) => {
      const { kind, message } = parseStoredError(r.errorMessage);
      return {
        claveAcceso: r.claveAcceso,
        errorMessage: message || 'Error desconocido',
        fecha: r.updatedAt.toISOString(),
        kind,
        retryable: isRetryable(kind),
      };
    });
  }
}
