/**
 * @fileoverview Adaptador — Parser de XML del SRI ecuatoriano.
 *
 * Implementa XmlSriParserPort usando `fast-xml-parser` (puro JS, sin
 * dependencias nativas). Extrae la información fiscal estructurada de
 * los distintos tipos de comprobante electrónico del SRI:
 *   factura, notaCredito, notaDebito, comprobanteRetencion,
 *   guiaRemision, liquidacionCompra.
 *
 * Todos comparten el bloque `infoTributaria` (emisor + claveAcceso +
 * codDoc) y un bloque `info*` específico con totales y comprador.
 *
 * @module XmlSriParserAdapter
 */

import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { DocumentType } from '@sgc/shared';

import {
  type XmlSriParserPort,
  type ParsedSriDocument,
  type SriDocumentItem,
} from '../../domain/ports/xml-sri-parser.port';

/** Tipo laxo para nodos del XML parseado. */
type XmlNode = Record<string, unknown>;

/** Posibles raíces de un comprobante del SRI. */
const COMPROBANTE_ROOTS = [
  'factura',
  'notaCredito',
  'notaDebito',
  'comprobanteRetencion',
  'guiaRemision',
  'liquidacionCompra',
] as const;

/** Mapa codDoc del SRI → DocumentType. */
const COD_DOC_MAP: Readonly<Record<string, DocumentType>> = {
  '01': DocumentType.FACTURA,
  '03': DocumentType.LIQUIDACION_COMPRA,
  '04': DocumentType.NOTA_CREDITO,
  '05': DocumentType.NOTA_DEBITO,
  '06': DocumentType.GUIA_REMISION,
  '07': DocumentType.RETENCION,
};

/** Mapa raíz XML → DocumentType (fallback si no hay codDoc). */
const ROOT_TYPE_MAP: Readonly<Record<string, DocumentType>> = {
  factura: DocumentType.FACTURA,
  notaCredito: DocumentType.NOTA_CREDITO,
  notaDebito: DocumentType.NOTA_DEBITO,
  comprobanteRetencion: DocumentType.RETENCION,
  guiaRemision: DocumentType.GUIA_REMISION,
  liquidacionCompra: DocumentType.LIQUIDACION_COMPRA,
};

@Injectable()
export class XmlSriParserAdapter implements XmlSriParserPort {
  private readonly logger = new Logger(XmlSriParserAdapter.name);

  private readonly parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    parseTagValue: false, // mantener strings; coaccionamos números nosotros
  });

  async validate(xmlContent: string): Promise<boolean> {
    try {
      const root = this.findComprobanteRoot(this.parser.parse(xmlContent));
      if (!root) return false;
      const infoTributaria = this.asNode(root['infoTributaria']);
      return Boolean(infoTributaria && infoTributaria['claveAcceso']);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`XML no parseable: ${msg}`);
      return false;
    }
  }

  async parse(xmlContent: string): Promise<ParsedSriDocument> {
    const parsed = this.parser.parse(xmlContent);
    const root = this.findComprobanteRoot(parsed);

    if (!root) {
      throw new Error(
        'XML del SRI inválido: no se encontró una raíz de comprobante reconocida.',
      );
    }

    const rootName = this.getRootName(parsed) ?? 'factura';
    const infoTributaria = this.asNode(root['infoTributaria']) ?? {};
    const infoSection = this.findInfoSection(root) ?? {};

    const codDoc = this.str(infoTributaria['codDoc']);
    const documentType =
      COD_DOC_MAP[codDoc] ?? ROOT_TYPE_MAP[rootName] ?? DocumentType.FACTURA;

    return {
      accessKey: this.str(infoTributaria['claveAcceso']),
      documentType,
      issuerTaxId: this.str(infoTributaria['ruc']),
      serialNumber: this.buildSerialNumber(infoTributaria),
      issuerName: this.str(infoTributaria['razonSocial']),
      issuerAddress: this.str(infoTributaria['dirMatriz']),
      issueDate: this.str(
        infoSection['fechaEmision'] ?? infoSection['fechaIniTransporte'],
      ),
      authorizationNumber: this.str(infoTributaria['claveAcceso']),
      subtotal: this.num(infoSection['totalSinImpuestos']),
      taxAmount: this.extractTaxAmount(infoSection),
      totalAmount: this.num(
        infoSection['importeTotal'] ?? infoSection['valorTotal'],
      ),
      buyerTaxId: this.str(
        infoSection['identificacionComprador'] ??
          infoSection['identificacionSujetoRetenido'],
      ),
      buyerName: this.str(
        infoSection['razonSocialComprador'] ??
          infoSection['razonSocialSujetoRetenido'],
      ),
      items: this.extractItems(root),
    };
  }

  // ── Helpers de navegación ─────────────────────────────────────────────────

  private findComprobanteRoot(parsed: unknown): XmlNode | null {
    const obj = this.asNode(parsed);
    if (!obj) return null;
    for (const key of COMPROBANTE_ROOTS) {
      const node = this.asNode(obj[key]);
      if (node) return node;
    }
    return null;
  }

  private getRootName(parsed: unknown): string | null {
    const obj = this.asNode(parsed);
    if (!obj) return null;
    return COMPROBANTE_ROOTS.find((key) => this.asNode(obj[key])) ?? null;
  }

  /** Encuentra el bloque info* (infoFactura, infoNotaCredito, etc.). */
  private findInfoSection(root: XmlNode): XmlNode | null {
    const key = Object.keys(root).find((k) => k.startsWith('info') && k !== 'infoTributaria');
    return key ? this.asNode(root[key]) : null;
  }

  private extractTaxAmount(infoSection: XmlNode): number {
    const totalConImpuestos = this.asNode(infoSection['totalConImpuestos']);
    if (!totalConImpuestos) return 0;

    const raw = totalConImpuestos['totalImpuesto'];
    const impuestos = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return impuestos.reduce((sum: number, imp: unknown) => {
      const node = this.asNode(imp);
      return sum + (node ? this.num(node['valor']) : 0);
    }, 0);
  }

  /**
   * Construye el número del comprobante "estab-ptoEmi-secuencial" a partir de
   * infoTributaria (p. ej. 001-002-000384367). Rellena con ceros a la izquierda.
   */
  private buildSerialNumber(infoTributaria: XmlNode): string {
    const estab = this.str(infoTributaria['estab']).padStart(3, '0');
    const ptoEmi = this.str(infoTributaria['ptoEmi']).padStart(3, '0');
    const secuencial = this.str(infoTributaria['secuencial']).padStart(9, '0');
    if (!estab && !ptoEmi && !secuencial) return '';
    return `${estab}-${ptoEmi}-${secuencial}`;
  }

  private extractItems(root: XmlNode): ReadonlyArray<SriDocumentItem> {
    const detalles = this.asNode(root['detalles']);
    if (!detalles) return [];

    const raw = detalles['detalle'];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return list.map((d: unknown): SriDocumentItem => {
      const node = this.asNode(d) ?? {};
      return {
        description: this.str(node['descripcion']),
        quantity: this.num(node['cantidad']),
        unitPrice: this.num(node['precioUnitario']),
        discount: this.num(node['descuento']),
        totalPrice: this.num(node['precioTotalSinImpuesto']),
      };
    });
  }

  // ── Coerción de tipos ──────────────────────────────────────────────────────

  private asNode(value: unknown): XmlNode | null {
    return value !== null && typeof value === 'object'
      ? (value as XmlNode)
      : null;
  }

  private str(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private num(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
