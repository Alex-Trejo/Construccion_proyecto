/**
 * @fileoverview Adaptador — Validador de XML contra esquemas XSD del SRI.
 *
 * Valida XMLs sanitizados contra los XSD oficiales del SRI descargados
 * localmente (offline). Usa la librería `libxmljs2` para validación
 * nativa XSD basada en libxml2.
 *
 * Los archivos XSD deben estar en: infrastructure/xsd/
 *
 * @module XmlValidatorAdapter
 */

import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';

import {
  type XmlValidatorPort,
  type XmlValidationResult,
} from '../../domain/ports/xml-validator.port';

@Injectable()
export class XmlValidatorAdapter implements XmlValidatorPort {
  private readonly logger = new Logger(XmlValidatorAdapter.name);

  /** Cache de la carga de libxmljs2 (undefined = aún no intentado). */
  private libxmljsCache: LibxmljsModule | null | undefined = undefined;
  /** Para avisar del fallback una sola vez (evita ruido en cada validación). */
  private warnedFallback = false;

  async validateAgainstXsd(
    xmlContent: string,
    xsdPath: string,
  ): Promise<XmlValidationResult> {
    this.logger.debug(`Validando XML contra XSD: ${xsdPath}`);

    try {
      // Intentar usar libxmljs2 si está disponible
      const libxmljs = await this.loadLibxmljs();

      if (libxmljs) {
        return this.validateWithLibxmljs(libxmljs, xmlContent, xsdPath);
      }

      // Fallback: validación básica por estructura. Se avisa UNA sola vez:
      // libxmljs2 es opcional (módulo nativo) y su ausencia es esperada.
      if (!this.warnedFallback) {
        this.warnedFallback = true;
        this.logger.warn(
          'libxmljs2 no disponible. Usando validación estructural básica (aviso único).',
        );
      }
      return this.validateBasicStructure(xmlContent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en validación XSD: ${errorMessage}`);
      return {
        isValid: false,
        errors: [`Error de validación: ${errorMessage}`],
      };
    }
  }

  /**
   * Intenta cargar libxmljs2 dinámicamente.
   * Si no está instalada, retorna null y usa el fallback.
   */
  private async loadLibxmljs(): Promise<LibxmljsModule | null> {
    // Se cachea el resultado: el import dinámico se intenta UNA vez, no en cada
    // validación (si no está, seguiría fallando igual).
    if (this.libxmljsCache !== undefined) {
      return this.libxmljsCache;
    }
    try {
      // Especificador no literal: `libxmljs2` es una dependencia OPCIONAL
      // (módulo nativo). Se evita la resolución estática de TS para que la
      // ausencia del módulo no rompa la compilación; si no está instalado,
      // el import falla en runtime y se usa el fallback estructural.
      const moduleName = 'libxmljs2';
      const mod = (await import(moduleName)) as LibxmljsModule;
      this.libxmljsCache = mod;
      return mod;
    } catch {
      this.libxmljsCache = null;
      return null;
    }
  }

  /**
   * Validación XSD nativa usando libxmljs2.
   */
  private async validateWithLibxmljs(
    libxmljs: LibxmljsModule,
    xmlContent: string,
    xsdPath: string,
  ): Promise<XmlValidationResult> {
    const xsdContent = await readFile(xsdPath, 'utf-8');
    const xsdDoc = libxmljs.parseXml(xsdContent);
    const xmlDoc = libxmljs.parseXml(xmlContent);

    const isValid = xmlDoc.validate(xsdDoc);

    if (isValid) {
      this.logger.log('XML válido contra XSD');
      return { isValid: true, errors: [] };
    }

    const errors = xmlDoc.validationErrors.map(
      (err: LibxmljsValidationError) => `Línea ${err.line}: ${err.message}`,
    );

    this.logger.warn(`XML inválido. ${errors.length} errores encontrados.`);
    return { isValid: false, errors };
  }

  /**
   * Validación estructural básica (fallback cuando libxmljs2 no está).
   * Verifica que el XML tenga los tags mínimos esperados del SRI.
   */
  private validateBasicStructure(xmlContent: string): XmlValidationResult {
    const errors: string[] = [];

    // Verificar que sea XML bien formado (tag de apertura y cierre)
    if (!xmlContent.includes('<?xml') && !xmlContent.includes('<factura')
        && !xmlContent.includes('<notaCredito') && !xmlContent.includes('<comprobanteRetencion')) {
      errors.push('El contenido no parece ser un XML de comprobante del SRI.');
    }

    // Verificar tags críticos del SRI
    const requiredTags = ['infoTributaria', 'ruc', 'claveAcceso'];
    for (const tag of requiredTags) {
      if (!xmlContent.includes(`<${tag}>`)) {
        errors.push(`Tag obligatorio faltante: <${tag}>`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Tipos para libxmljs2 (evita dependencia directa en el tipado).
 * Se definen aquí porque libxmljs2 es una dependencia opcional.
 */
interface LibxmljsModule {
  parseXml(content: string): LibxmljsDocument;
}

interface LibxmljsDocument {
  validate(xsd: LibxmljsDocument): boolean;
  validationErrors: ReadonlyArray<LibxmljsValidationError>;
}

interface LibxmljsValidationError {
  readonly message: string;
  readonly line: number;
  readonly column: number;
}
