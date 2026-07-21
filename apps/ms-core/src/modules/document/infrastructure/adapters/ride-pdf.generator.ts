/**
 * @fileoverview Generador del RIDE (Representación Impresa del Documento
 * Electrónico) en PDF, usando pdfkit. Devuelve un Buffer listo para subir a MinIO.
 *
 * @module RidePdfGenerator
 */

import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

/** Datos mínimos para generar el RIDE. */
export interface RideData {
  readonly documentType: string;
  readonly numeroFactura: string;
  readonly rucEmisor: string;
  readonly razonSocialEmisor: string | null;
  readonly fechaEmision: string | null;
  readonly claveAcceso: string | null;
  readonly subtotal: number;
  readonly iva: number;
  readonly total: number;
  readonly items: ReadonlyArray<{
    readonly descripcion: string;
    readonly cantidad: number;
    readonly precioUnitario: number;
    readonly total: number;
  }>;
}

const money = (v: number): string => `$${(Number.isFinite(v) ? v : 0).toFixed(2)}`;

@Injectable()
export class RidePdfGenerator {
  /** Genera el PDF del comprobante y lo devuelve como Buffer. */
  generate(data: RideData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const width = right - left;

      // ── Encabezado ──────────────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(15).text('SGC — REPRESENTACIÓN IMPRESA (RIDE)', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(12).text(data.documentType, { continued: true });
      doc.text(`N° ${data.numeroFactura}`, { align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke();
      doc.moveDown(0.8);

      // ── Datos del emisor ────────────────────────────────────────────────────
      const field = (label: string, value: string) => {
        doc.font('Helvetica-Bold').fontSize(10).text(`${label} `, { continued: true });
        doc.font('Helvetica').text(value);
      };
      field('Emisor:', data.razonSocialEmisor ?? '—');
      field('RUC:', data.rucEmisor);
      field('Fecha de emisión:', data.fechaEmision ?? '—');
      if (data.claveAcceso) {
        doc.font('Helvetica-Bold').fontSize(10).text('Clave de acceso:');
        doc.font('Helvetica').fontSize(8).text(data.claveAcceso);
      }
      doc.moveDown(0.6);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke();
      doc.moveDown(0.6);

      // ── Detalle de ítems ────────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(11).text('DETALLE');
      doc.moveDown(0.4);

      const colQty = right - 210;
      const colPrice = right - 120;
      const colTotal = right - 60;
      const headerY = doc.y;
      doc.fontSize(9);
      doc.text('Descripción', left, headerY);
      doc.text('Cant.', colQty, headerY, { width: 50, align: 'right' });
      doc.text('P.Unit.', colPrice, headerY, { width: 55, align: 'right' });
      doc.text('Total', colTotal, headerY, { width: 60, align: 'right' });
      doc.moveDown(0.3);
      doc.font('Helvetica');

      if (data.items.length === 0) {
        doc.fontSize(9).text('(Sin detalle de ítems)', left);
      } else {
        for (const item of data.items) {
          const rowY = doc.y;
          doc.fontSize(9);
          doc.text(item.descripcion, left, rowY, { width: colQty - left - 8 });
          const lineY = rowY;
          doc.text(String(item.cantidad), colQty, lineY, { width: 50, align: 'right' });
          doc.text(money(item.precioUnitario), colPrice, lineY, { width: 55, align: 'right' });
          doc.text(money(item.total), colTotal, lineY, { width: 60, align: 'right' });
          doc.moveDown(0.3);
          if (doc.y > doc.page.height - 140) doc.addPage();
        }
      }

      doc.moveDown(0.5);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke();
      doc.moveDown(0.5);

      // ── Totales ─────────────────────────────────────────────────────────────
      const totalRow = (label: string, value: string, bold = false) => {
        const yy = doc.y;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10);
        doc.text(label, colPrice - 40, yy, { width: 100, align: 'right' });
        doc.text(value, colTotal, yy, { width: 60, align: 'right' });
        doc.moveDown(0.3);
      };
      totalRow('Subtotal:', money(data.subtotal));
      totalRow('IVA:', money(data.iva));
      totalRow('TOTAL:', money(data.total), true);

      doc.moveDown(1);
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666')
        .text('Documento generado por el Sistema de Gestión de Comprobantes (SGC).', left, doc.y, { width });

      doc.end();
    });
  }
}
