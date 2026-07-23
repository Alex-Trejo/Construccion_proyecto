/**
 * @fileoverview Caso de uso — Importar comprobantes completos desde el SRI.
 *
 * Toma las claves en staging (IncomingInvoice PENDIENTE) de un dueño, consulta
 * el Web Service del SRI por cada clave, sanitiza/valida y parsea el XML, y
 * crea el comprobante COMPLETO (con ítems e impuestos) en la tabla `documents`
 * (aislado por dueño, con unicidad owner + RUC + número). Además auto-provisiona
 * el proveedor emisor.
 *
 * Se ejecuta en segundo plano (fire-and-forget) tras la carga del TXT: cada
 * consulta al SRI tarda ~1-3 s, así que no puede hacerse dentro de la petición
 * HTTP/TCP sin exceder el timeout del gateway.
 *
 * @module ImportSriDocumentsUseCase
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { InvoiceProcessingStatus } from '@sgc/shared';

import {
  type IncomingInvoiceRepositoryPort,
  INCOMING_INVOICE_REPOSITORY_PORT,
} from '../../../domain/ports/incoming-invoice-repository.port';
import {
  type SriSoapApiPort,
  SRI_SOAP_API_PORT,
} from '../../../domain/ports/sri-soap-api.port';
import {
  type XmlSriParserPort,
  XML_SRI_PARSER_PORT,
} from '../../../domain/ports/xml-sri-parser.port';
import { FetchAndSanitizeXmlUseCase } from '../processing/fetch-and-sanitize-xml.use-case';
import { PersistParsedDocumentUseCase } from '../processing/persist-parsed-document.use-case';
import {
  classifyImportError,
  isRetryable,
  parseStoredError,
  withKindPrefix,
} from '../../import-error.util';

@Injectable()
export class ImportSriDocumentsUseCase {
  private readonly logger = new Logger(ImportSriDocumentsUseCase.name);

  /** Evita ejecuciones concurrentes por dueño (mismo proceso). */
  private readonly running = new Set<string>();

  constructor(
    @Inject(INCOMING_INVOICE_REPOSITORY_PORT)
    private readonly invoiceRepo: IncomingInvoiceRepositoryPort,
    @Inject(SRI_SOAP_API_PORT)
    private readonly sriSoap: SriSoapApiPort,
    @Inject(XML_SRI_PARSER_PORT)
    private readonly xmlParser: XmlSriParserPort,
    private readonly fetchAndSanitize: FetchAndSanitizeXmlUseCase,
    private readonly persistParsed: PersistParsedDocumentUseCase,
  ) {}

  /**
   * Procesa las claves PENDIENTE del dueño indicado, consultando el SRI y
   * creando los comprobantes. Idempotente y protegido contra reentradas.
   */
  async processPending(ownerId: string | null): Promise<void> {
    const key = ownerId ?? '__system__';
    if (this.running.has(key)) {
      this.logger.debug(`Importación SRI ya en curso para owner=${key}, se omite.`);
      return;
    }
    this.running.add(key);

    try {
      const pending = (
        await this.invoiceRepo.findByEstado(InvoiceProcessingStatus.PENDIENTE)
      ).filter((inv) => (inv.ownerId ?? null) === ownerId);

      this.logger.log(
        `Importación SRI: ${pending.length} claves pendientes para owner=${key}`,
      );

      for (const invoice of pending) {
        try {
          const auth = await this.sriSoap.fetchAuthorization(invoice.claveAcceso);

          if (auth.estado !== 'AUTORIZADO' || !auth.comprobante) {
            const msg = `SRI: ${auth.estado || 'sin autorización'}`;
            invoice.markAsError(withKindPrefix('not_authorized', msg));
            await this.invoiceRepo.update(invoice);
            continue;
          }

          const sanitized = await this.fetchAndSanitize.sanitizeAndValidateXml(
            auth.comprobante,
          );
          const xml = sanitized.xmlLimpio ?? auth.comprobante;

          const parsed = await this.xmlParser.parse(xml);
          await this.persistParsed.execute(parsed, xml, ownerId, 'MANUAL_TXT');

          invoice.markAsProcessed(auth.comprobante, xml);
          await this.invoiceRepo.update(invoice);
          this.logger.log(`✅ Comprobante importado: ${invoice.claveAcceso}`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          const kind = classifyImportError(msg);
          invoice.markAsError(withKindPrefix(kind, msg));
          await this.invoiceRepo.update(invoice);
          this.logger.warn(`❌ Clave ${invoice.claveAcceso} falló [${kind}]: ${msg}`);
        }
      }
    } finally {
      this.running.delete(key);
    }
  }

  /**
   * Reintenta las claves que quedaron en ERROR (p. ej. por fallos de red DNS):
   * las resetea a PENDIENTE y vuelve a procesarlas contra el SRI.
   * @returns cuántas claves se reencolaron.
   */
  async retryFailed(ownerId: string | null): Promise<{ retried: number }> {
    const failed = await this.invoiceRepo.findByOwnerAndEstado(
      ownerId,
      InvoiceProcessingStatus.ERROR,
    );
    // Solo se reintentan los fallos transitorios de red; los "no autorizado"
    // del SRI no se recuperan reintentando y se dejan como están.
    const retryables = failed.filter((inv) =>
      isRetryable(parseStoredError(inv.errorMessage).kind),
    );
    for (const invoice of retryables) {
      invoice.resetToPending();
      await this.invoiceRepo.update(invoice);
    }
    this.logger.log(
      `Reintentando ${retryables.length}/${failed.length} claves (red) para owner=${ownerId}`,
    );
    if (retryables.length > 0) await this.processPending(ownerId);
    return { retried: retryables.length };
  }
}
