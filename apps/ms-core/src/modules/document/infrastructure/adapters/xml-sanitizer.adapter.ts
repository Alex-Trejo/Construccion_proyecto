/**
 * @fileoverview Adaptador — Sanitizador de XML de comprobantes del SRI.
 *
 * Los XML del SRI de Ecuador vienen "sucios". Este adaptador aplica
 * una cadena de transformaciones regex para limpiarlos.
 *
 * IMPORTANTE: 2 modos de operación:
 *   - sanitizeKeepSignature(): Para validación XSD (NO quita la firma).
 *   - sanitize(): Para parsing de datos (SÍ quita la firma).
 *
 * El orden correcto de uso es:
 *   1. sanitizeKeepSignature(rawXml) → validar contra XSD
 *   2. sanitize(rawXml) → parsear datos fiscales
 *
 * @module XmlSanitizerAdapter
 */

import { Injectable, Logger } from '@nestjs/common';
import { type XmlSanitizerPort } from '../../domain/ports/xml-sanitizer.port';

@Injectable()
export class XmlSanitizerAdapter implements XmlSanitizerPort {
  private readonly logger = new Logger(XmlSanitizerAdapter.name);

  /**
   * Sanitiza MANTENIENDO la firma digital (para validación XSD).
   */
  sanitizeKeepSignature(rawXml: string): string {
    this.logger.debug('Sanitizando XML (manteniendo firma para XSD)');

    let xml = rawXml;

    xml = this.removeBomAndControlChars(xml);
    xml = this.unwrapCdata(xml);
    xml = this.decodeHtmlEntities(xml);
    // ❌ NO se elimina la firma aquí
    xml = this.normalizeWhitespace(xml);
    xml = this.ensureXmlDeclaration(xml);

    return xml;
  }

  /**
   * Sanitiza ELIMINANDO la firma digital (para parsing de datos).
   */
  sanitize(rawXml: string): string {
    this.logger.debug('Sanitizando XML (eliminando firma para parsing)');

    let xml = rawXml;

    xml = this.removeBomAndControlChars(xml);
    xml = this.unwrapCdata(xml);
    xml = this.decodeHtmlEntities(xml);
    xml = this.removeDigitalSignature(xml); // ✅ Se elimina la firma
    xml = this.normalizeWhitespace(xml);
    xml = this.ensureXmlDeclaration(xml);

    this.logger.debug('Sanitización completa (sin firma)');
    return xml;
  }

  /**
   * Elimina BOM (Byte Order Mark) y caracteres de control no imprimibles.
   */
  private removeBomAndControlChars(xml: string): string {
    return xml
      .replace(/\ufeff/g, '')
      .replace(/\ufffe/g, '')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  /**
   * Elimina wrappers CDATA (puede haber múltiples niveles de anidamiento).
   */
  private unwrapCdata(xml: string): string {
    let result = xml;
    let previousLength = 0;
    while (result.length !== previousLength) {
      previousLength = result.length;
      result = result
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '');
    }
    return result;
  }

  /**
   * Decodifica HTML entities con múltiples pasadas (el SRI a veces
   * codifica doblemente: &amp;lt; → &lt; → <).
   */
  private decodeHtmlEntities(xml: string): string {
    let result = xml;
    let previousResult = '';
    let iterations = 0;
    const maxIterations = 5;

    while (result !== previousResult && iterations < maxIterations) {
      previousResult = result;
      result = result
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_match: string, code: string) =>
          String.fromCharCode(Number(code)),
        )
        .replace(/&#x([0-9a-fA-F]+);/g, (_match: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16)),
        );
      iterations++;
    }

    return result;
  }

  /**
   * Elimina el nodo de firma electrónica <ds:Signature>.
   * Soporta múltiples variantes de namespace: ds:, dsig:, y bare.
   */
  private removeDigitalSignature(xml: string): string {
    return xml
      .replace(/<ds:Signature[\s\S]*?<\/ds:Signature>/gi, '')
      .replace(/<dsig:Signature[\s\S]*?<\/dsig:Signature>/gi, '')
      .replace(
        /<Signature\s+xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#"[\s\S]*?<\/Signature>/gi,
        '',
      );
  }

  /**
   * Normaliza whitespace excesivo.
   */
  private normalizeWhitespace(xml: string): string {
    return xml
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\t/g, '  ')
      .trim();
  }

  /**
   * Asegura que el XML tenga la declaración XML al inicio.
   */
  private ensureXmlDeclaration(xml: string): string {
    if (!xml.startsWith('<?xml')) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    }
    return xml;
  }
}
