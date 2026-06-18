/**
 * @fileoverview Puerto — Parser de XML del SRI ecuatoriano.
 *
 * Define el contrato que DEBE implementar cualquier adaptador que
 * se encargue de leer y extraer datos de un archivo XML de
 * comprobante electrónico del SRI.
 *
 * Clean Architecture (Hexagonal):
 *   - Este puerto vive en Domain/Application.
 *   - El adaptador concreto vive en Infrastructure.
 *   - El caso de uso ProcessSriXmlUseCase depende de este puerto.
 *
 * 🛑 NOTA: El adaptador de infraestructura que implemente este puerto
 * será construido con el código personalizado del desarrollador.
 *
 * @module XmlSriParserPort
 */

import { DocumentType } from '@sgc/shared';

/**
 * Datos extraídos de un XML del SRI ecuatoriano.
 * Representa la información fiscal relevante parseada del comprobante.
 */
export interface ParsedSriDocument {
  /** Clave de acceso (49 dígitos). */
  readonly accessKey: string;

  /** Tipo de comprobante detectado. */
  readonly documentType: DocumentType;

  /** RUC del emisor. */
  readonly issuerTaxId: string;

  /** Razón social del emisor. */
  readonly issuerName: string;

  /** Dirección del establecimiento emisor. */
  readonly issuerAddress: string;

  /** Fecha de emisión (formato original del XML). */
  readonly issueDate: string;

  /** Número de autorización del SRI. */
  readonly authorizationNumber: string;

  /** Subtotal sin impuestos. */
  readonly subtotal: number;

  /** Total IVA. */
  readonly taxAmount: number;

  /** Total del comprobante. */
  readonly totalAmount: number;

  /** RUC/Cédula del receptor/comprador (cuando aplica). */
  readonly buyerTaxId: string;

  /** Razón social del receptor/comprador. */
  readonly buyerName: string;

  /** Detalle de ítems del comprobante. */
  readonly items: ReadonlyArray<SriDocumentItem>;
}

/**
 * Detalle de un ítem dentro del comprobante electrónico.
 */
export interface SriDocumentItem {
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
  readonly totalPrice: number;
}

/**
 * Contrato para parsear XML del SRI.
 * El adaptador concreto (Infrastructure) implementará la lógica
 * de extracción y limpieza del XML.
 */
export interface XmlSriParserPort {
  /**
   * Parsea un string XML de comprobante electrónico del SRI.
   *
   * @param xmlContent - Contenido XML como string (UTF-8).
   * @returns Datos estructurados extraídos del comprobante.
   * @throws {Error} Si el XML no tiene el formato esperado del SRI.
   */
  parse(xmlContent: string): Promise<ParsedSriDocument>;

  /**
   * Valida que un string XML tenga la estructura básica del SRI.
   *
   * @param xmlContent - Contenido XML a validar.
   * @returns true si la estructura es válida, false si no.
   */
  validate(xmlContent: string): Promise<boolean>;
}

/**
 * Token de inyección NestJS para el parser XML del SRI.
 */
export const XML_SRI_PARSER_PORT = Symbol('XML_SRI_PARSER_PORT');
