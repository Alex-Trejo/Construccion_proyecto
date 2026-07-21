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

const SYSTEM_PROMPT = `Eres un extractor experto de facturas electrónicas del SRI (Ecuador).
Analiza la imagen y devuelve EXCLUSIVAMENTE un objeto JSON válido con EXACTAMENTE esta forma:
{
  "rucEmisor": string,            // RUC del emisor (13 dígitos) o cédula
  "razonSocialEmisor": string,    // nombre/razón social del emisor
  "numeroFactura": string,        // número del comprobante (ej. 022-025-000098720)
  "fechaEmision": string,         // fecha de emisión en formato YYYY-MM-DD
  "subtotal": number,             // ver reglas
  "iva": number,                  // ver reglas
  "total": number,                // ver reglas
  "items": [
    { "descripcion": string, "cantidad": number, "precioUnitario": number, "descuento": number, "total": number }
  ]
}

REGLAS PARA LOS TOTALES (muy importante — las facturas del SRI tienen VARIAS líneas):
- "subtotal" = el valor de "SUBTOTAL SIN IMPUESTOS" (la base imponible TOTAL, antes de IVA).
  NO uses "SUBTOTAL 15%" ni "SUBTOTAL 0%" por separado: usa el "SUBTOTAL SIN IMPUESTOS"
  (que es la suma de todos). Debe ser ≈ la suma de los "Precio Total" de los ítems.
- "iva" = el TOTAL del IVA a pagar (línea "IVA 15%", "IVA 12%", etc.). Suma todas las de IVA.
  Si la factura no tiene IVA, pon 0.
- "total" = "VALOR TOTAL" o "IMPORTE TOTAL" (lo que se paga). Cumple: subtotal + iva ≈ total.
- Antes de responder, VERIFICA la coherencia: si subtotal + iva no da ≈ total, revisa qué línea
  tomaste; casi siempre "subtotal" es el SUBTOTAL SIN IMPUESTOS, no el subtotal de una sola tarifa.

Ítems: por cada línea del detalle usa su "Precio Total" (sin impuestos) como "total".

Reglas generales: usa 0 para números que no encuentres y "" para texto faltante. Los números van
como número (no string), con punto decimal. NO incluyas texto, comentarios ni markdown fuera del JSON.`;

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

  async extractFromImage(
    content: Buffer,
    contentType: string,
    storageKey: string,
  ): Promise<IOcrResultDto> {
    this.logger.log(`OCR (OpenAI ${this.model}) para: ${storageKey}`);

    // Imagen INLINE como data URI: OpenAI no necesita descargar de MinIO.
    const mime = contentType || 'image/png';
    const dataUri = `data:${mime};base64,${content.toString('base64')}`;

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
            { type: 'image_url', image_url: { url: dataUri } },
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

    let subtotal = this.num(p['subtotal']);
    const iva = this.num(p['iva']);
    const total = this.num(p['total']);

    // Reconciliación: el subtotal (base imponible) DEBE ser la suma de los ítems.
    // En facturas con varias líneas "SUBTOTAL" el modelo a veces toma la de una
    // sola tarifa; los ítems son la fuente fiable. Si difieren, se corrige.
    const itemsSum = this.round2(items.reduce((s, i) => s + i.total, 0));
    if (items.length > 0 && itemsSum > 0 && Math.abs(subtotal - itemsSum) > 0.02) {
      this.logger.debug(
        `OCR: subtotal ${subtotal} corregido a la suma de ítems ${itemsSum}.`,
      );
      subtotal = itemsSum;
    }

    return {
      rucEmisor: this.str(p['rucEmisor']),
      razonSocialEmisor: this.str(p['razonSocialEmisor']),
      numeroFactura: this.str(p['numeroFactura']),
      fechaEmision: this.str(p['fechaEmision']),
      subtotal,
      iva,
      total,
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

  /** Redondea a 2 decimales (evita errores de coma flotante). */
  private round2(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }
}
