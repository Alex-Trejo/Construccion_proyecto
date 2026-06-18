/**
 * @fileoverview Puerto — API REST del SRI para catastro de contribuyentes.
 *
 * Contrato para consultar datos de contribuyentes en el catastro del SRI.
 *
 * ⚠️ NOTAS sobre la API del SRI:
 * - El SRI NO provee una API REST pública oficial para desarrolladores.
 * - El endpoint usado es un servicio interno del portal SRI en Línea.
 * - Requiere User-Agent spoofing y rate limiting para evitar bloqueos WAF.
 * - No existe API oficial para consulta histórica masiva de comprobantes.
 * - Para datos masivos, considerar el portal de Datos Abiertos del SRI (CSV).
 *
 * @module SriRestApiPort
 */

import { ContributorType, TaxRegime } from '@sgc/shared';

/** Datos del contribuyente obtenidos del catastro del SRI. */
export interface SriContributorData {
  /** RUC del contribuyente. */
  readonly ruc: string;
  /** Razón social. */
  readonly razonSocial: string;
  /** Nombre comercial (puede estar vacío). */
  readonly nombreComercial: string;
  /** Estado del contribuyente (ACTIVO, PASIVO, SUSPENDIDO). */
  readonly estadoContribuyente: string;
  /** Tipo de contribuyente. */
  readonly tipoContribuyente: ContributorType;
  /** Clase de contribuyente (ej: ESPECIAL, OTROS). */
  readonly claseContribuyente: string;
  /** Régimen tributario. */
  readonly regimen: TaxRegime;
  /** Si está obligado a llevar contabilidad. */
  readonly obligadoLlevarContabilidad: boolean;
  /** Si es agente de retención. */
  readonly agenteRetencion: boolean;
  /** Si es contribuyente especial (y su resolución). */
  readonly contribuyenteEspecial: boolean;
  /** Número de resolución de contribuyente especial (si aplica). */
  readonly resolucionContribuyenteEspecial: string | null;
  /** Actividad económica principal. */
  readonly actividadEconomicaPrincipal: string;
  /** Dirección del establecimiento matriz. */
  readonly direccionMatriz: string;
}

/** Contrato para el adaptador REST del catastro SRI. */
export interface SriRestApiPort {
  /**
   * Consulta los datos de un contribuyente por su RUC.
   *
   * @param ruc - RUC de 13 dígitos.
   * @returns Datos del contribuyente o null si no existe.
   * @throws {Error} Si el servicio no responde o hay bloqueo WAF.
   */
  fetchContributorByRuc(ruc: string): Promise<SriContributorData | null>;
}

export const SRI_REST_API_PORT = Symbol('SRI_REST_API_PORT');
