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
import { PersistParsedDocumentUseCase } from './persist-parsed-document.use-case';

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
    private readonly persistParsed: PersistParsedDocumentUseCase,
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
    ownerId: string | null = null,
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

    // ── Paso 3: Registrar el Comprobante (documents) + validar + proveedor ──
    // Unifica el correo IMAP con la carga TXT: la factura recibida por correo
    // también se registra como Comprobante (con RIDE PDF y validación), no solo
    // en Comunicaciones. La unicidad owner+RUC+N° evita duplicar si ya llegó.
    try {
      const created = await this.persistParsed.execute(
        parsedDocument,
        xmlLimpio,
        ownerId,
        'IMAP_SYNC',
      );
      this.logger.log(
        created
          ? `Comprobante registrado desde correo: ${parsedDocument.accessKey}`
          : `Comprobante ya existía (correo), se omitió: ${parsedDocument.accessKey}`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error registrando comprobante de ${fileName}: ${errorMsg}`);
      // No se falla el procesamiento: el XML ya está parseado y guardado en el correo.
    }

    // Nota: El guardado del adjunto en MinIO y en received_emails ya fue realizado
    // por el DocumentReceivedHandler antes de llamar a este caso de uso.

    return {
      success: true,
      parsedDocument,
      errorMessage: null,
    };
  }
}
