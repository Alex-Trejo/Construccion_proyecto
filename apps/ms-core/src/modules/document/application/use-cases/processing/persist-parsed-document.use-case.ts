/**
 * @fileoverview Caso de uso — Persistir un comprobante ya parseado del SRI.
 *
 * Lógica compartida por AMBOS orígenes de XML autorizado:
 *   - Carga TXT → consulta SRI → parse  (ImportSriDocumentsUseCase)
 *   - Correo IMAP → XML adjunto → parse  (ProcessSriXmlUseCase)
 *
 * Crea el comprobante en `documents` (con unicidad owner+RUC+N°), genera el
 * RIDE PDF en MinIO, lo valida (máquina de estados) y auto-provisiona el emisor.
 *
 * @module PersistParsedDocumentUseCase
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  normalizeInvoiceNumber,
  type ICreateDocumentDto,
  type ICreateDocumentItemDto,
  type ICreateDocumentTaxDto,
} from '@sgc/shared';

import { type ParsedSriDocument } from '../../../domain/ports/xml-sri-parser.port';
import {
  type DocumentRepositoryPort,
  DOCUMENT_REPOSITORY_PORT,
} from '../../../domain/ports/document-repository.port';
import {
  type ObjectStoragePort,
  OBJECT_STORAGE_PORT,
} from '../../../../communication/domain/ports/object-storage.port';
import { RidePdfGenerator } from '../../../infrastructure/adapters/ride-pdf.generator';
import { ValidateDocumentUseCase } from '../validations/validate-document.use-case';
import { AutoProvisionEntitiesUseCase } from '../processing/auto-provision-entities.use-case';

@Injectable()
export class PersistParsedDocumentUseCase {
  private readonly logger = new Logger(PersistParsedDocumentUseCase.name);
  private readonly bucket: string;

  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly storage: ObjectStoragePort,
    private readonly ridePdf: RidePdfGenerator,
    private readonly validateDocument: ValidateDocumentUseCase,
    private readonly autoProvision: AutoProvisionEntitiesUseCase,
    config: ConfigService,
  ) {
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET_NAME');
  }

  /**
   * Crea el comprobante (si no existe), lo valida, genera su RIDE y provisiona
   * el emisor. Idempotente por unicidad owner+RUC+N°.
   *
   * @param source Origen del comprobante ('MANUAL_TXT' | 'IMAP_SYNC').
   * @returns `true` si se creó; `false` si ya existía.
   */
  async execute(
    parsed: ParsedSriDocument,
    xml: string,
    ownerId: string | null,
    source = 'MANUAL_TXT',
  ): Promise<boolean> {
    const numero = normalizeInvoiceNumber(parsed.serialNumber || parsed.accessKey);

    const exists = await this.documentRepo.existsByNumero(
      ownerId,
      parsed.issuerTaxId,
      numero,
    );
    if (exists) {
      this.logger.debug(`Comprobante ${numero} ya existe para el dueño, se omite.`);
      return false;
    }

    const items: ICreateDocumentItemDto[] = parsed.items.map((it) => ({
      descripcion: it.description,
      cantidad: it.quantity,
      precioUnitario: it.unitPrice,
      descuento: it.discount,
      total: it.totalPrice,
    }));

    const taxes: ICreateDocumentTaxDto[] = [];
    if (parsed.taxAmount > 0) {
      taxes.push({
        codigo: '2', // IVA en el catálogo del SRI
        tarifa: parsed.subtotal > 0
          ? Math.round((parsed.taxAmount / parsed.subtotal) * 100)
          : 0,
        baseImponible: parsed.subtotal,
        valor: parsed.taxAmount,
      });
    }

    const fechaEmision = this.toIsoDate(parsed.issueDate);

    // RIDE (PDF) en MinIO para previsualización (best-effort).
    const storageKey = await this.generateAndStorePdf(
      {
        documentType: parsed.documentType,
        numeroFactura: numero,
        rucEmisor: parsed.issuerTaxId,
        razonSocialEmisor: parsed.issuerName || null,
        fechaEmision: fechaEmision ?? null,
        claveAcceso: parsed.accessKey || null,
        subtotal: parsed.subtotal,
        iva: parsed.taxAmount,
        total: parsed.totalAmount,
        items,
      },
      ownerId,
    );

    const dto: ICreateDocumentDto = {
      documentType: parsed.documentType,
      rucEmisor: parsed.issuerTaxId,
      numeroFactura: numero,
      subtotal: parsed.subtotal,
      iva: parsed.taxAmount,
      total: parsed.totalAmount,
      items,
      taxes,
      ...(parsed.issuerName ? { razonSocialEmisor: parsed.issuerName } : {}),
      ...(parsed.accessKey ? { claveAcceso: parsed.accessKey } : {}),
      ...(fechaEmision ? { fechaEmision } : {}),
      ...(xml ? { xmlContent: xml } : {}),
      ...(storageKey ? { storageKey } : {}),
    };

    const saved = await this.documentRepo.save(dto, ownerId, source);

    // Validación automática (PENDIENTE → EN_VALIDACION → VALIDADO/INCONSISTENTE).
    try {
      await this.validateDocument.execute(saved.id, ownerId);
    } catch (error) {
      this.logger.warn(`Validación automática falló para ${numero}: ${this.msg(error)}`);
    }

    // Auto-provisionar el proveedor emisor (best-effort).
    try {
      await this.autoProvision.execute(parsed, ownerId);
    } catch (error) {
      this.logger.debug(`Auto-provisión omitida para ${parsed.issuerTaxId}: ${this.msg(error)}`);
    }

    return true;
  }

  /** Genera el RIDE en PDF y lo sube a MinIO. Devuelve la key o null (best-effort). */
  private async generateAndStorePdf(
    data: Parameters<RidePdfGenerator['generate']>[0],
    ownerId: string | null,
  ): Promise<string | null> {
    try {
      const pdf = await this.ridePdf.generate(data);
      const safe = (data.claveAcceso || data.numeroFactura).replace(/[^\w-]/g, '_');
      const key = `documents/${ownerId ?? 'system'}/ride-${safe}.pdf`;
      await this.storage.uploadFile({
        bucket: this.bucket,
        key,
        content: pdf,
        contentType: 'application/pdf',
      });
      return key;
    } catch (error) {
      this.logger.warn(`No se pudo generar/guardar el RIDE PDF: ${this.msg(error)}`);
      return null;
    }
  }

  /** "dd/mm/yyyy" del SRI → ISO "yyyy-mm-dd"; si no aplica, undefined. */
  private toIsoDate(raw: string): string | undefined {
    const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return raw.trim() || undefined;
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  private msg(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
