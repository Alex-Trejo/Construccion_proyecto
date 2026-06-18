/**
 * @fileoverview Adaptador — API REST del SRI (Catastro de Contribuyentes).
 *
 * Consulta datos de contribuyentes en el catastro del SRI.
 *
 * ⚠️ REGLAS ANTI-BLOQUEO (CRÍTICAS):
 *   1. Rate Limiting: sleep(1000ms) entre peticiones consecutivas.
 *   2. User-Agent Spoofing: simula un navegador Chrome real.
 *   3. No hacer consultas masivas paralelas.
 *
 * ⚠️ NOTA IMPORTANTE SOBRE ESTA API:
 *   El SRI NO provee una API REST pública oficial. Este endpoint es un
 *   servicio interno del portal srienlinea. Puede cambiar sin previo aviso.
 *   No existe API oficial para consulta histórica masiva de comprobantes.
 *   Para datos masivos, usar el portal de Datos Abiertos del SRI (CSV).
 *
 * @module SriRestApiAdapter
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { ContributorType, TaxRegime } from '@sgc/shared';

import {
  type SriRestApiPort,
  type SriContributorData,
} from '../../domain/ports/sri-rest-api.port';

/** Headers que simulan un navegador real para evitar bloqueo WAF del SRI. */
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept':
    'application/json, text/plain, */*',
  'Accept-Language': 'es-EC,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://srienlinea.sri.gob.ec/sri-en-linea/',
  'Origin': 'https://srienlinea.sri.gob.ec',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
} as const;

/** Delay mínimo entre peticiones al SRI (anti-rate-limiting). */
const RATE_LIMIT_MS = 1_000;

@Injectable()
export class SriRestApiAdapter implements SriRestApiPort {
  private readonly logger = new Logger(SriRestApiAdapter.name);
  private readonly httpClient: AxiosInstance;
  private lastRequestTimestamp = 0;

  private readonly baseUrl =
    'https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc';

  constructor() {
    this.httpClient = axios.create({
      timeout: 15_000,
      headers: BROWSER_HEADERS,
    });
  }

  async fetchContributorByRuc(ruc: string): Promise<SriContributorData | null> {
    this.logger.log(`Consultando catastro SRI para RUC: ${ruc}`);

    // ── Rate Limiting: respetar intervalo mínimo ─────────────────────────
    await this.enforceRateLimit();

    try {
      const url = `${this.baseUrl}?&ruc=${ruc}`;

      const response = await this.httpClient.get<ReadonlyArray<Record<string, unknown>>>(url);

      this.lastRequestTimestamp = Date.now();

      if (!response.data || response.data.length === 0) {
        this.logger.warn(`RUC ${ruc} no encontrado en el catastro del SRI`);
        return null;
      }

      const raw = response.data[0];
      return this.mapToContributorData(raw, ruc);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        this.logger.error(
          `WAF del SRI bloqueó la consulta (403). Posible rate limiting.`,
        );
      }
      throw new Error(
        `Error al consultar catastro SRI para RUC ${ruc}: ${axiosError.message}`,
      );
    }
  }

  /**
   * Espera el tiempo necesario para cumplir el rate limit.
   */
  private async enforceRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTimestamp;
    if (elapsed < RATE_LIMIT_MS) {
      const waitTime = RATE_LIMIT_MS - elapsed;
      this.logger.debug(`Rate limit: esperando ${waitTime}ms`);
      await this.sleep(waitTime);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mapea la respuesta cruda del SRI a nuestra interfaz tipada.
   */
  private mapToContributorData(
    raw: Record<string, unknown>,
    ruc: string,
  ): SriContributorData {
    const razonSocial = this.safeString(raw['nombreCompleto'] ?? raw['razonSocial']);
    const tipoContribuyente = this.mapContributorType(
      this.safeString(raw['tipoContribuyente']),
    );
    const regimen = this.mapTaxRegime(this.safeString(raw['regimen']));
    const obligadoStr = this.safeString(
      raw['obligadoLlevarContabilidad'],
    ).toUpperCase();

    return {
      ruc,
      razonSocial,
      nombreComercial: this.safeString(raw['nombreComercial']),
      estadoContribuyente: this.safeString(raw['estadoContribuyente']),
      tipoContribuyente,
      claseContribuyente: this.safeString(raw['claseContribuyente']),
      regimen,
      obligadoLlevarContabilidad: obligadoStr === 'SI' || obligadoStr === 'S',
      agenteRetencion: this.safeString(raw['agenteRetencion']).toUpperCase() === 'SI',
      contribuyenteEspecial:
        this.safeString(raw['contribuyenteEspecial']).toUpperCase() === 'SI',
      resolucionContribuyenteEspecial:
        this.safeString(raw['resolucionContribuyenteEspecial']) || null,
      actividadEconomicaPrincipal: this.safeString(
        raw['actividadEconomicaPrincipal'],
      ),
      direccionMatriz: this.safeString(raw['direccionMatriz']),
    };
  }

  /** Convierte un valor desconocido a string de forma segura. */
  private safeString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private mapContributorType(raw: string): ContributorType {
    const upper = raw.toUpperCase();
    if (upper.includes('NATURAL')) return ContributorType.PERSONA_NATURAL;
    return ContributorType.SOCIEDAD;
  }

  private mapTaxRegime(raw: string): TaxRegime {
    const upper = raw.toUpperCase();
    if (upper.includes('EMPRENDEDOR')) return TaxRegime.RIMPE_EMPRENDEDOR;
    if (upper.includes('POPULAR')) return TaxRegime.RIMPE_NEGOCIO_POPULAR;
    if (upper.includes('RIMPE')) return TaxRegime.RIMPE_EMPRENDEDOR;
    return TaxRegime.GENERAL;
  }
}
