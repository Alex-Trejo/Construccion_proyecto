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

    const response = await this.httpClient.post<string>(
      this.soapUrl,
      soapEnvelope,
      { responseType: 'text' },
    );

    const rawXml = response.data;
    return this.parseSoapResponse(rawXml, claveAcceso);
  }

  /**
   * Construye el envelope SOAP para la consulta de autorización.
   */
  private buildSoapEnvelope(claveAcceso: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobanteLote>
      <claveAccesoLote>${claveAcceso}</claveAccesoLote>
    </ec:autorizacionComprobanteLote>
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
    const autorizacionMatch = rawXml.match(
      /<autorizacion>([\s\S]*?)<\/autorizacion>/,
    );

    if (!autorizacionMatch) {
      throw new Error(
        `SRI SOAP: No se encontró el tag <autorizacion> para clave ${claveAcceso}`,
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
    const match = xml.match(regex);
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
    const messageRegex = /<mensaje>([\s\S]*?)<\/mensaje>/g;
    let match = messageRegex.exec(xml);

    while (match !== null) {
      const msgXml = match[1];
      messages.push({
        identificador: this.extractTag(msgXml, 'identificador'),
        mensaje: this.extractTag(msgXml, 'mensaje'),
        informacionAdicional: this.extractTag(msgXml, 'informacionAdicional'),
        tipo: this.extractTag(msgXml, 'tipo'),
      });
      match = messageRegex.exec(xml);
    }

    return messages;
  }
}
