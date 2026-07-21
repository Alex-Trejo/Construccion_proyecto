/**
 * @fileoverview Adaptador — API SOAP del SRI (Autorización de Comprobantes).
 *
 * Consume el Web Service SOAP de Autorización Offline del SRI
 * para descargar el XML de un comprobante por su clave de acceso.
 *
 * Endpoint: https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
 *
 * El XML del SRI viene envuelto en un envelope SOAP y frecuentemente
 * dentro de <![CDATA[...]]> dentro del tag <comprobante>.
 *
 * @module SriSoapApiAdapter
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { type AxiosInstance } from 'axios';

import {
  type SriSoapApiPort,
  type SriAuthorizationResponse,
  type SriMessage,
} from '../../domain/ports/sri-soap-api.port';

@Injectable()
export class SriSoapApiAdapter implements SriSoapApiPort {
  private readonly logger = new Logger(SriSoapApiAdapter.name);
  private readonly httpClient: AxiosInstance;
  private readonly soapUrl: string;

  constructor() {
    this.soapUrl = 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline';

    this.httpClient = axios.create({
      timeout: 30_000,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
      },
    });
  }

  async fetchAuthorization(claveAcceso: string): Promise<SriAuthorizationResponse> {
    this.logger.log(`Consultando SRI SOAP para clave: ${claveAcceso}`);

    const soapEnvelope = this.buildSoapEnvelope(claveAcceso);
    const rawXml = await this.postWithRetry(soapEnvelope, claveAcceso);
    return this.parseSoapResponse(rawXml, claveAcceso);
  }

  /**
   * POST al WS del SRI con reintentos ante errores de RED transitorios
   * (DNS ENOTFOUND, timeouts, conexión reseteada) — habituales al consultar el
   * SRI de producción. NO reintenta errores de negocio (no autorizado).
   */
  private async postWithRetry(
    soapEnvelope: string,
    claveAcceso: string,
    maxAttempts = 4,
  ): Promise<string> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.httpClient.post<string>(
          this.soapUrl,
          soapEnvelope,
          { responseType: 'text' },
        );
        return response.data;
      } catch (error) {
        lastError = error;
        if (!this.isTransientNetworkError(error) || attempt === maxAttempts) {
          break;
        }
        const delayMs = 1000 * attempt; // backoff lineal: 1s, 2s, 3s
        this.logger.warn(
          `SRI intento ${attempt}/${maxAttempts} falló (${this.errMsg(error)}) para ${claveAcceso}. Reintentando en ${delayMs}ms…`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /** ¿Es un error de red transitorio (merece reintento)? */
  private isTransientNetworkError(error: unknown): boolean {
    const code = (error as { code?: string })?.code ?? '';
    const msg = this.errMsg(error);
    return (
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      code === 'ECONNABORTED' ||
      /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|timeout/i.test(msg)
    );
  }

  private errMsg(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Construye el envelope SOAP para la consulta de autorización de un
   * comprobante individual por su clave de acceso.
   *
   * Operación correcta del WS "AutorizacionComprobantesOffline":
   *   autorizacionComprobante(claveAccesoComprobante) → RespuestaAutorizacionComprobante
   * (la operación `autorizacionComprobanteLote` es para lotes, no aplica aquí).
   */
  private buildSoapEnvelope(claveAcceso: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Parsea la respuesta SOAP del SRI extrayendo los datos de autorización.
   * Maneja CDATA, HTML entities y la estructura de respuesta del SRI.
   */
  private parseSoapResponse(
    rawXml: string,
    claveAcceso: string,
  ): SriAuthorizationResponse {
    // Extraer el contenido del tag <autorizacion>
    const authRegex = /<autorizacion>([\s\S]*?)<\/autorizacion>/;
    const autorizacionMatch = authRegex.exec(rawXml);

    if (!autorizacionMatch) {
      throw new Error(
        `El SRI no devolvió autorización para la clave ${claveAcceso} ` +
          `(no encontrada o no autorizada en el catálogo del SRI).`,
      );
    }

    const autorizacionXml = autorizacionMatch[1];

    // Extraer campos individuales
    const estado = this.extractTag(autorizacionXml, 'estado');
    const numeroAutorizacion = this.extractTag(autorizacionXml, 'numeroAutorizacion');
    const fechaAutorizacion = this.extractTag(autorizacionXml, 'fechaAutorizacion');

    // El comprobante puede venir en CDATA
    let comprobante = this.extractTag(autorizacionXml, 'comprobante');
    comprobante = this.unwrapCdata(comprobante);
    comprobante = this.decodeHtmlEntities(comprobante);

    // Extraer mensajes (informativos/error)
    const mensajes = this.extractMessages(autorizacionXml);

    if (!estado) {
      throw new Error(
        `SRI SOAP: Respuesta sin estado para clave ${claveAcceso}`,
      );
    }

    this.logger.log(
      `SRI SOAP respuesta: estado=${estado}, clave=${claveAcceso}`,
    );

    return {
      estado,
      numeroAutorizacion: numeroAutorizacion ?? claveAcceso,
      fechaAutorizacion: fechaAutorizacion ?? new Date().toISOString(),
      comprobante,
      mensajes,
    };
  }

  /** Extrae el contenido de un tag XML simple. */
  private extractTag(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
    const match = regex.exec(xml);
    return match ? match[1].trim() : '';
  }

  /** Elimina wrappers CDATA: <![CDATA[...]]> → contenido. */
  private unwrapCdata(content: string): string {
    return content
      .replace(/^<!\[CDATA\[/, '')
      .replace(/\]\]>$/, '')
      .trim();
  }

  /** Decodifica HTML entities comunes en respuestas del SRI. */
  private decodeHtmlEntities(content: string): string {
    return content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /** Extrae los mensajes de la respuesta del SRI. */
  private extractMessages(xml: string): ReadonlyArray<SriMessage> {
    const messages: SriMessage[] = [];
    
    // Extraer el bloque completo de <mensajes>
    const mensajesRegex = /<mensajes>([\s\S]*?)<\/mensajes>/;
    const mensajesBlockMatch = mensajesRegex.exec(xml);
    if (!mensajesBlockMatch) return [];

    const mensajesBlock = mensajesBlockMatch[1];
    
    // Separar por <identificador> para evitar el problema de <mensaje> anidado
    const partes = mensajesBlock.split('<identificador>');

    for (let i = 1; i < partes.length; i++) {
      const parte = '<identificador>' + partes[i];
      messages.push({
        identificador: this.extractTag(parte, 'identificador'),
        mensaje: this.extractTag(parte, 'mensaje'),
        informacionAdicional: this.extractTag(parte, 'informacionAdicional'),
        tipo: this.extractTag(parte, 'tipo'),
      });
    }

    return messages;
  }
}
