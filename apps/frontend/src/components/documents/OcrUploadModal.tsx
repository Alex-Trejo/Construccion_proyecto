/**
 * @fileoverview Modal de subida de comprobante físico con OCR.
 *
 * Flujo de dos pasos:
 *   1. Subir imagen (multipart) → POST /documents/physical → IOcrResultDto.
 *   2. Revisar los datos extraídos (editables) → POST /documents (ICreateDocumentDto)
 *      incluyendo el storageKey devuelto por el OCR.
 *
 * RNF04: el estado "procesando" debe ser ágil (~3-8s con OpenAI Vision).
 *
 * @module documents/OcrUploadModal
 */

'use client';

import { useState } from 'react';
import {
  DocumentType,
  type ICreateDocumentDto,
  type IDocumentDto,
  type IOcrResultDto,
} from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n/language-provider';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { FileDrop } from '@/components/ui/FileDrop';
import { formatMoney } from '@/lib/format';
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/document-options';

interface OcrUploadModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

/** Estado editable de revisión tras el OCR. */
interface ReviewState {
  documentType: DocumentType;
  rucEmisor: string;
  razonSocialEmisor: string;
  numeroFactura: string;
  fechaEmision: string;
  subtotal: string;
  iva: string;
  total: string;
}

function toReview(ocr: IOcrResultDto): ReviewState {
  return {
    documentType: DocumentType.FACTURA,
    rucEmisor: ocr.rucEmisor,
    razonSocialEmisor: ocr.razonSocialEmisor,
    numeroFactura: ocr.numeroFactura,
    fechaEmision: ocr.fechaEmision,
    subtotal: String(ocr.subtotal),
    iva: String(ocr.iva),
    total: String(ocr.total),
  };
}

export function OcrUploadModal({ open, onClose, onSaved }: OcrUploadModalProps) {
  const { apiUpload, apiPost } = useApi();
  const { t } = useTranslation();

  const [file, setFile] = useState<File | null>(null);
  const [ocr, setOcr] = useState<IOcrResultDto | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setOcr(null);
    setReview(null);
    setProcessing(false);
    setSaving(false);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const errText = (err: unknown, fallbackKey: string): string =>
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : t(fallbackKey);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiUpload<IOcrResultDto>(
        '/documents/physical',
        formData,
      );
      setOcr(result);
      setReview(toReview(result));
    } catch (err) {
      setError(errText(err, 'documents.ocr.error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!ocr || !review) return;
    setSaving(true);
    setError(null);
    try {
      const dto: ICreateDocumentDto = {
        documentType: review.documentType,
        rucEmisor: review.rucEmisor.trim(),
        razonSocialEmisor: review.razonSocialEmisor.trim(),
        numeroFactura: review.numeroFactura.trim(),
        fechaEmision: review.fechaEmision.trim() || undefined,
        subtotal: Number(review.subtotal) || 0,
        iva: Number(review.iva) || 0,
        total: Number(review.total) || 0,
        items: ocr.items,
        taxes: [],
        storageKey: ocr.storageKey,
      };
      await apiPost<IDocumentDto>('/documents', dto);
      onSaved();
      close();
    } catch (err) {
      setError(errText(err, 'common.unexpectedError'));
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof ReviewState, value: string) =>
    setReview((prev) => (prev ? { ...prev, [field]: value } : prev));

  return (
    <Modal open={open} title={t('documents.ocr.title')} onClose={close}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}

        {!review ? (
          <>
            <FileDrop
              accept="image/*"
              label={t('documents.ocr.dropLabel')}
              hint={t('documents.ocr.dropHint')}
              file={file}
              onFile={setFile}
              disabled={processing}
            />
            <Button
              variant="primary"
              disabled={!file || processing}
              onClick={() => void handleProcess()}
            >
              {processing ? t('documents.ocr.processing') : t('documents.uploadPhoto')}
            </Button>
          </>
        ) : (
          <>
            <div>
              <h3 className="font-bold">{t('documents.ocr.reviewTitle')}</h3>
              <p className="text-sm text-dark/60">{t('documents.ocr.reviewDesc')}</p>
            </div>

            <Field label={t('documents.form.type')}>
              <Select
                value={review.documentType}
                onChange={(e) => set('documentType', e.target.value)}
              >
                {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('documents.form.ruc')}>
              <Input
                value={review.rucEmisor}
                onChange={(e) => set('rucEmisor', e.target.value)}
              />
            </Field>
            <Field label={t('documents.form.razon')}>
              <Input
                value={review.razonSocialEmisor}
                onChange={(e) => set('razonSocialEmisor', e.target.value)}
              />
            </Field>
            <Field label={t('documents.form.numero')}>
              <Input
                value={review.numeroFactura}
                onChange={(e) => set('numeroFactura', e.target.value)}
              />
            </Field>
            <Field label={t('documents.form.fecha')}>
              <Input
                value={review.fechaEmision}
                onChange={(e) => set('fechaEmision', e.target.value)}
                placeholder="2026-01-31"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t('documents.form.subtotal')}>
                <Input
                  type="number"
                  step="0.01"
                  value={review.subtotal}
                  onChange={(e) => set('subtotal', e.target.value)}
                />
              </Field>
              <Field label={t('documents.form.iva')}>
                <Input
                  type="number"
                  step="0.01"
                  value={review.iva}
                  onChange={(e) => set('iva', e.target.value)}
                />
              </Field>
              <Field label={t('documents.form.total')}>
                <Input
                  type="number"
                  step="0.01"
                  value={review.total}
                  onChange={(e) => set('total', e.target.value)}
                />
              </Field>
            </div>

            {ocr && ocr.items.length > 0 && (
              <div className="brutal-card-sm bg-secondary p-3 text-sm">
                <p className="mb-2 font-semibold">{t('documents.form.items')}</p>
                <ul className="flex flex-col gap-1">
                  {ocr.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{item.descripcion}</span>
                      <span className="font-mono">{formatMoney(item.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? t('common.saving') : t('documents.ocr.save')}
              </Button>
              <Button variant="secondary" onClick={close} disabled={saving}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
