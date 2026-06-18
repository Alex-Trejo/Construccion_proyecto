/**
 * @fileoverview Puerto — API SOAP del SRI para descarga de comprobantes.
 *
 * Contrato para consumir el Web Service de Autorización Offline del SRI.
 * Endpoint: https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
 *
 * @module SriSoapApiPort
 */

/** Respuesta de autorización del SRI. */
export interface SriAuthorizationResponse {
  /** Estado de la autorización (AUTORIZADO, NO AUTORIZADO). */
  readonly estado: string;
  /** Número de autorización. */
  readonly numeroAutorizacion: string;
  /** Fecha de autorización (ISO string). */
  readonly fechaAutorizacion: string;
  /** Comprobante XML (puede venir envuelto en CDATA). */
  readonly comprobante: string;
  /** Mensajes informativos o de error del SRI. */
  readonly mensajes: ReadonlyArray<SriMessage>;
}

/** Mensaje individual del SRI. */
export interface SriMessage {
  readonly identificador: string;
  readonly mensaje: string;
  readonly informacionAdicional: string;
  readonly tipo: string;
}

/** Contrato para el adaptador SOAP del SRI. */
export interface SriSoapApiPort {
  /**
   * Consulta la autorización de un comprobante por clave de acceso.
   *
   * @param claveAcceso - Clave de acceso de 49 dígitos.
   * @returns Respuesta de autorización con el XML del comprobante.
   * @throws {Error} Si el servicio no responde o la clave no es válida.
   */
  fetchAuthorization(claveAcceso: string): Promise<SriAuthorizationResponse>;
}

export const SRI_SOAP_API_PORT = Symbol('SRI_SOAP_API_PORT');
