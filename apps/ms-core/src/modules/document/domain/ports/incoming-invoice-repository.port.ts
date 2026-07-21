/**
 * @fileoverview Puerto — Repositorio de IncomingInvoice (staging).
 * @module IncomingInvoiceRepositoryPort
 */

import { IncomingInvoice } from '../entities/incoming-invoice.entity';
import { InvoiceProcessingStatus } from '@sgc/shared';

export interface IncomingInvoiceRepositoryPort {
  save(invoice: IncomingInvoice): Promise<IncomingInvoice>;
  saveBatch(invoices: ReadonlyArray<IncomingInvoice>): Promise<void>;
  findById(id: string): Promise<IncomingInvoice | null>;
  findByClaveAcceso(claveAcceso: string): Promise<IncomingInvoice | null>;
  findByEstado(estado: InvoiceProcessingStatus): Promise<ReadonlyArray<IncomingInvoice>>;
  /** Claves de un dueño en un estado dado (p. ej. ERROR para trazabilidad). */
  findByOwnerAndEstado(
    ownerId: string | null,
    estado: InvoiceProcessingStatus,
  ): Promise<ReadonlyArray<IncomingInvoice>>;
  update(invoice: IncomingInvoice): Promise<IncomingInvoice>;
  existsByClaveAcceso(claveAcceso: string): Promise<boolean>;
}

export const INCOMING_INVOICE_REPOSITORY_PORT = Symbol('INCOMING_INVOICE_REPOSITORY_PORT');
