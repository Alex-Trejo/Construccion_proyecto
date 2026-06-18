/**
 * @fileoverview Caso de uso — Procesar XML del SRI ecuatoriano.
 *
 * Responsabilidades:
 *   1. Recibir el contenido XML (string) de un comprobante.
 *   2. Validar la estructura del XML usando el XmlSriParserPort.
 *   3. Extraer los datos fiscales (ParsedSriDocument).
 *   4. Persistir el documento en la base de datos.
 *   5. Almacenar el archivo XML original en MinIO.
 *
 * Clean Architecture:
 *   - Depende SOLO de puertos (interfaces), nunca de implementaciones.
 *   - XmlSriParserPort → Inyectado por infraestructura.
 *   - DocumentRepositoryPort → Inyectado por infraestructura.
 *   - StoragePort → Inyectado por infraestructura.
 *
 * 🛑 ESQUELETO: Este caso de uso será completado cuando el desarrollador
 * proporcione su código de parsing XML personalizado.
 *
 * @module ProcessSriXmlUseCase
 */

import { Injectable, Inject, Logger } from '@nestjs/common';

import {
  XmlSriParserPort,
  XML_SRI_PARSER_PORT,
  type ParsedSriDocument,
} from '../../domain/ports/xml-sri-parser.port';
import { FetchAndSanitizeXmlUseCase } from './fetch-and-sanitize-xml.use-case';
import { AutoProvisionEntitiesUseCase } from './auto-provision-entities.use-case';

/**
 * Resultado de procesar un XML del SRI.
 */
export interface ProcessSriXmlResult {
  /** Indica si el procesamiento fue exitoso. */
  readonly success: boolean;

  /** Datos parseados del comprobante. */
  readonly parsedDocument: ParsedSriDocument | null;

  /** Mensaje de error si el procesamiento falló. */
  readonly errorMessage: string | null;
}

@Injectable()
export class ProcessSriXmlUseCase {
  private readonly logger = new Logger(ProcessSriXmlUseCase.name);

  constructor(
    @Inject(XML_SRI_PARSER_PORT)
    private readonly xmlParser: XmlSriParserPort,
    private readonly fetchAndSanitizeXml: FetchAndSanitizeXmlUseCase,
    private readonly autoProvisionEntities: AutoProvisionEntitiesUseCase,
  ) {}

  /**
   * Procesa un XML de comprobante electrónico del SRI.
   * Ejecuta el pipeline: Sanitización/Validación XSD -> Parsing -> Auto-creación de Entidades.
   *
   * @param xmlContent - Contenido XML como string.
   * @param fileName - Nombre original del archivo (para logging).
   * @returns Resultado del procesamiento.
   */
  async execute(
    xmlContent: string,
    fileName: string,
  ): Promise<ProcessSriXmlResult> {
    this.logger.log(`Procesando pipeline XML del SRI: ${fileName}`);

    // ── Paso 1: Sanitización y Validación XSD ────────────────────────────
    const sanitizeResult = await this.fetchAndSanitizeXml.sanitizeAndValidateXml(xmlContent);

    if (!sanitizeResult.success) {
      this.logger.warn(`Validación XSD / Sanitización fallida para ${fileName}: ${sanitizeResult.errorMessage}`);
      return {
        success: false,
        parsedDocument: null,
        errorMessage: sanitizeResult.errorMessage,
      };
    }

    const xmlLimpio = sanitizeResult.xmlLimpio as string;

    // ── Paso 2: Validar estructura XML y Parsear datos ───────────────────
    const isValid = await this.xmlParser.validate(xmlLimpio);
    if (!isValid) {
      this.logger.warn(`XML inválido (parseo): ${fileName}`);
      return {
        success: false,
        parsedDocument: null,
        errorMessage: `El archivo "${fileName}" no tiene la estructura XML válida del SRI.`,
      };
    }

    const parsedDocument = await this.xmlParser.parse(xmlLimpio);

    this.logger.log(
      `XML parseado exitosamente: clave=${parsedDocument.accessKey}, ` +
      `emisor=${parsedDocument.issuerName}, total=${parsedDocument.totalAmount}`,
    );

    // ── Paso 3: Auto-creación de Proveedor y Compañía ────────────────────
    try {
      const provisionResult = await this.autoProvisionEntities.execute(parsedDocument);
      if (provisionResult.supplierCreated) {
        this.logger.log(`Proveedor ${provisionResult.supplierRuc} auto-creado exitosamente.`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en auto-aprovisionamiento para ${fileName}: ${errorMsg}`);
      // Decisión: no fallar el procesamiento si la auto-creación falla,
      // el documento ya está parseado correctamente.
    }

    // Nota: El guardado en MinIO y en tabla received_emails ya fue realizado
    // por el DocumentReceivedHandler antes de llamar a este caso de uso.

    return {
      success: true,
      parsedDocument,
      errorMessage: null,
    };
  }
}
