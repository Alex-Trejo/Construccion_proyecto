/**
 * @fileoverview Caso de uso — Descargar, sanitizar y validar XML del SRI.
 *
 * Flujo:
 *   1. Toma los IncomingInvoice con estado PENDIENTE.
 *   2. Para cada uno, consume el SOAP del SRI para bajar el XML.
 *   3. Sanitiza el XML (limpia firma, CDATA, entities).
 *   4. Valida el XML contra el XSD (si está configurado).
 *   5. Actualiza el IncomingInvoice con el XML limpio (PROCESADO) o error.
 *
 * Esta misma lógica de sanitización/validación es REUTILIZABLE
 * para XMLs que lleguen vía correo/IMAP (ms-sync).
 *
 * @module FetchAndSanitizeXmlUseCase
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceProcessingStatus } from '@sgc/shared';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';

import {
  type IncomingInvoiceRepositoryPort,
  INCOMING_INVOICE_REPOSITORY_PORT,
} from '../../domain/ports/incoming-invoice-repository.port';
import {
  type SriSoapApiPort,
  SRI_SOAP_API_PORT,
} from '../../domain/ports/sri-soap-api.port';
import {
  type XmlSanitizerPort,
  XML_SANITIZER_PORT,
} from '../../domain/ports/xml-sanitizer.port';
import {
  type XmlValidatorPort,
  XML_VALIDATOR_PORT,
} from '../../domain/ports/xml-validator.port';

/** Resultado del procesamiento de un lote de invoices pendientes. */
export interface FetchAndSanitizeResult {
  readonly totalProcessed: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly errors: ReadonlyArray<{ claveAcceso: string; error: string }>;
}

/** Resultado de sanitizar un XML individual (reutilizable por ms-sync). */
export interface SanitizeXmlResult {
  readonly success: boolean;
  readonly xmlCrudo: string;
  readonly xmlLimpio: string | null;
  readonly errorMessage: string | null;
}

/**
 * Mapa de etiqueta raíz del XML al path relativo del XSD.
 * Estructura: { tagXml: 'subcarpeta/archivo.xsd' }
 * Usa la versión más reciente de cada esquema disponible.
 */
const XSD_FILE_MAP: Readonly<Record<string, string>> = {
  factura: 'factura/factura_V2.1.0.xsd',
  notaCredito: 'nota-credito/NotaCredito_V1.1.0.xsd',
  notaDebito: 'nota-debito/NotaDebito_V1.0.0.xsd',
  comprobanteRetencion: 'comprobante-retencion/ComprobanteRetencion_V2.0.0.xsd',
  guiaRemision: 'guia-remision/GuiaRemision_V1.1.0.xsd',
  liquidacionCompra: 'liquidacion-compra/LiquidacionCompra_V1.1.0.xsd',
};


@Injectable()
export class FetchAndSanitizeXmlUseCase {
  private readonly logger = new Logger(FetchAndSanitizeXmlUseCase.name);

  /**
   * Path base a la carpeta de XSD. Leído de la variable XSD_SCHEMAS_PATH.
   * Si no existe o la carpeta no tiene archivos, la validación XSD se omite.
   */
  private readonly xsdBasePath: string | null;

  constructor(
    @Inject(INCOMING_INVOICE_REPOSITORY_PORT)
    private readonly invoiceRepo: IncomingInvoiceRepositoryPort,

    @Inject(SRI_SOAP_API_PORT)
    private readonly sriSoap: SriSoapApiPort,

    @Inject(XML_SANITIZER_PORT)
    private readonly xmlSanitizer: XmlSanitizerPort,

    @Inject(XML_VALIDATOR_PORT)
    private readonly xmlValidator: XmlValidatorPort,

    configService: ConfigService,
  ) {
    // Lectura opcional: si la variable no existe, no crasheamos (no es fail-fast)
    // porque los XSD son una validación complementaria, no crítica para arrancar.
    const envPath = configService.get<string>('XSD_SCHEMAS_PATH') ?? null;
    this.xsdBasePath = this.resolveXsdBasePath(envPath);

    if (this.xsdBasePath) {
      this.logger.log(`✅ XSD schemas path configurado: ${this.xsdBasePath}`);
    } else {
      this.logger.warn(
        '⚠️ XSD_SCHEMAS_PATH no configurado o carpeta no encontrada. ' +
        'La validación XSD se OMITIRÁ. Descarga los XSD oficiales del SRI ' +
        'y colócalos en infrastructure/xsd/',
      );
    }
  }

  /**
   * Resuelve el path base de los XSD de forma robusta, independiente del cwd.
   *
   * Como `ms-core` se ejecuta desde `apps/ms-core`, un valor relativo como
   * `./infrastructure/xsd` (que apunta a la raíz del monorepo) no resuelve
   * contra el cwd. Por eso se prueban varios candidatos:
   *   1. Relativo al cwd / absoluto (tal cual).
   *   2. Relativo a la raíz del monorepo (detectada por `pnpm-workspace.yaml`).
   *
   * @returns El primer path existente, o null si ninguno existe.
   */
  private resolveXsdBasePath(envPath: string | null): string | null {
    if (!envPath) return null;

    const candidates: string[] = [resolve(envPath)];

    const repoRoot = this.findRepoRoot();
    if (repoRoot) {
      candidates.push(resolve(repoRoot, envPath));
    }

    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }

  /** Busca hacia arriba la raíz del monorepo (marcada por pnpm-workspace.yaml). */
  private findRepoRoot(): string | null {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
        return dir;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }

  /**
   * Procesa todas las IncomingInvoice pendientes.
   * Descarga XML del SRI, sanitiza y valida.
   */
  async execute(): Promise<FetchAndSanitizeResult> {
    this.logger.log('Iniciando descarga y sanitización de XML pendientes');

    const pendingInvoices = await this.invoiceRepo.findByEstado(
      InvoiceProcessingStatus.PENDIENTE,
    );

    this.logger.log(`Facturas pendientes encontradas: ${pendingInvoices.length}`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ claveAcceso: string; error: string }> = [];

    for (const invoice of pendingInvoices) {
      try {
        // ── 1. Descargar XML del SRI ──────────────────────────────────────
        const authResponse = await this.sriSoap.fetchAuthorization(
          invoice.claveAcceso,
        );

        if (authResponse.estado !== 'AUTORIZADO') {
          const errorMsg = `SRI rechazó clave ${invoice.claveAcceso}: ${authResponse.estado}`;
          invoice.markAsError(errorMsg);
          await this.invoiceRepo.update(invoice);
          errors.push({ claveAcceso: invoice.claveAcceso, error: errorMsg });
          errorCount++;
          continue;
        }

        // ── 2. Sanitizar + Validar ────────────────────────────────────────
        const sanitizeResult = await this.sanitizeAndValidateXml(
          authResponse.comprobante,
        );

        if (!sanitizeResult.success) {
          invoice.markAsError(sanitizeResult.errorMessage ?? 'Error desconocido');
          await this.invoiceRepo.update(invoice);
          errors.push({
            claveAcceso: invoice.claveAcceso,
            error: sanitizeResult.errorMessage ?? 'Error de sanitización',
          });
          errorCount++;
          continue;
        }

        // ── 3. Marcar como procesado ──────────────────────────────────────
        invoice.markAsProcessed(
          authResponse.comprobante,
          sanitizeResult.xmlLimpio ?? '',
        );
        await this.invoiceRepo.update(invoice);
        successCount++;

        this.logger.log(`✅ XML procesado: ${invoice.claveAcceso}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        invoice.markAsError(errorMsg);
        await this.invoiceRepo.update(invoice);
        errors.push({ claveAcceso: invoice.claveAcceso, error: errorMsg });
        errorCount++;
        this.logger.error(`❌ Error procesando ${invoice.claveAcceso}: ${errorMsg}`);
      }
    }

    const result: FetchAndSanitizeResult = {
      totalProcessed: pendingInvoices.length,
      successCount,
      errorCount,
      errors,
    };

    this.logger.log(
      `Lote completado: ${successCount} OK, ${errorCount} errores de ${pendingInvoices.length} total`,
    );

    return result;
  }

  /**
   * Sanitiza y valida un XML individual.
   * REUTILIZABLE por ms-sync para XML recibidos por IMAP.
   *
   * Flujo de 2 pasos:
   *   1. sanitizeKeepSignature() → validar XSD (la firma es parte del esquema)
   *   2. sanitize() → quitar firma para parsear datos fiscales
   */
  async sanitizeAndValidateXml(rawXml: string): Promise<SanitizeXmlResult> {
    try {
      // ── Paso 1: Sanitizar MANTENIENDO firma (para validación XSD) ───────
      const xmlConFirma = this.xmlSanitizer.sanitizeKeepSignature(rawXml);

      // ── Paso 2: Validar contra XSD (si está configurado) ────────────────
      if (this.xsdBasePath) {
        const xsdFile = this.resolveXsdFile(xmlConFirma);

        if (xsdFile) {
          const validation = await this.xmlValidator.validateAgainstXsd(
            xmlConFirma,
            xsdFile,
          );

          if (!validation.isValid) {
            return {
              success: false,
              xmlCrudo: rawXml,
              xmlLimpio: null,
              errorMessage: `Validación XSD fallida: ${validation.errors.join('; ')}`,
            };
          }

          this.logger.debug(`XSD validación OK: ${xsdFile}`);
        }
      }

      // ── Paso 3: Sanitizar ELIMINANDO firma (para parsing de datos) ──────
      const xmlLimpio = this.xmlSanitizer.sanitize(rawXml);

      return {
        success: true,
        xmlCrudo: rawXml,
        xmlLimpio,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        xmlCrudo: rawXml,
        xmlLimpio: null,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Detecta el tipo de comprobante del XML y resuelve el path
   * al archivo XSD correspondiente.
   *
   * Busca el tag raíz del XML (ej: <factura>, <notaCredito>) y
   * lo mapea al archivo XSD usando XSD_FILE_MAP.
   *
   * @returns Path absoluto al XSD o null si no se puede determinar.
   */
  private resolveXsdFile(xmlContent: string): string | null {
    if (!this.xsdBasePath) return null;

    // Detectar el tag raíz del comprobante
    for (const [tagName, xsdFileName] of Object.entries(XSD_FILE_MAP)) {
      if (xmlContent.includes(`<${tagName}`)) {
        const fullPath = resolve(this.xsdBasePath, xsdFileName);

        if (existsSync(fullPath)) {
          return fullPath;
        }

        this.logger.warn(
          `XSD esperado no encontrado: ${fullPath}. Omitiendo validación XSD para <${tagName}>.`,
        );
        return null;
      }
    }

    this.logger.warn(
      'No se pudo detectar el tipo de comprobante en el XML. Omitiendo validación XSD.',
    );
    return null;
  }
}

