/**
 * @fileoverview Adaptador OCR — OpenAI Vision (SDK oficial `openai`).
 *
 * Envía la imagen del comprobante al modelo de visión con un System Prompt
 * estricto y `response_format: json_object` para obtener SIEMPRE un JSON
 * estructurado (RUC, fecha, totales, items).
 *
 * @module OpenAiOcrAdapter
 */

import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  type IOcrResultDto,
  type ICreateDocumentItemDto,
} from '@sgc/shared';

import { type OcrPort } from '../../domain/ports/ocr.port';

const SYSTEM_PROMPT = `Eres un extractor experto de datos de comprobantes/facturas electrónicas del SRI (Ecuador).
Analiza la imagen y devuelve EXCLUSIVAMENTE un objeto JSON válido con EXACTAMENTE esta forma:
{
  "rucEmisor": string,            // RUC del emisor (13 dígitos) o cédula
  "razonSocialEmisor": string,    // nombre/razón social del emisor
  "numeroFactura": string,        // número del comprobante (ej. 001-001-000000123)
  "fechaEmision": string,         // fecha en formato YYYY-MM-DD
  "subtotal": number,             // subtotal sin impuestos
  "iva": number,                  // total de IVA
  "total": number,                // total a pagar
  "items": [
    { "descripcion": string, "cantidad": number, "precioUnitario": number, "descuento": number, "total": number }
  ]
}
Reglas: usa 0 para números que no encuentres y "" para texto faltante. Los números van como número, NO como string. NO incluyas texto, comentarios ni markdown fuera del JSON.`;

@Injectable()
export class OpenAiOcrAdapter implements OcrPort {
  private readonly logger = new Logger(OpenAiOcrAdapter.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.model = config.getOrThrow<string>('OPENAI_OCR_MODEL');
  }

  async extractFromImageUrl(
    imageUrl: string,
    storageKey: string,
  ): Promise<IOcrResultDto> {
    this.logger.log(`OCR (OpenAI ${this.model}) para: ${storageKey}`);

    const completion = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extrae los datos fiscales de este comprobante.',
            },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.logger.error(`OCR: la respuesta no es JSON válido: ${raw.slice(0, 200)}`);
      throw new BadGatewayException('El OCR no devolvió un JSON válido.');
    }

    return this.normalize(parsed, storageKey);
  }

  // ── Normalización defensiva ────────────────────────────────────────────────

  private normalize(
    p: Record<string, unknown>,
    storageKey: string,
  ): IOcrResultDto {
    const rawItems = Array.isArray(p['items']) ? (p['items'] as unknown[]) : [];
    const items: ICreateDocumentItemDto[] = rawItems.map((it) => {
      const i = (it ?? {}) as Record<string, unknown>;
      return {
        descripcion: this.str(i['descripcion']),
        cantidad: this.num(i['cantidad']),
        precioUnitario: this.num(i['precioUnitario']),
        descuento: this.num(i['descuento']),
        total: this.num(i['total']),
      };
    });

    return {
      rucEmisor: this.str(p['rucEmisor']),
      razonSocialEmisor: this.str(p['razonSocialEmisor']),
      numeroFactura: this.str(p['numeroFactura']),
      fechaEmision: this.str(p['fechaEmision']),
      subtotal: this.num(p['subtotal']),
      iva: this.num(p['iva']),
      total: this.num(p['total']),
      items,
      storageKey,
    };
  }

  private str(v: unknown): string {
    return v === null || v === undefined ? '' : String(v).trim();
  }

  private num(v: unknown): number {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
}
