/**
 * @fileoverview Modal para EDITAR un comprobante ya guardado.
 * Corrige tipo, razón social, fecha, montos e ítems (RUC y N° son fijos).
 * Al guardar (PUT /documents/:id) el backend lo REVALIDA automáticamente.
 * @module documents/EditDocumentModal
 */

'use client';

import { useEffect, useState } from 'react';
import {
  DocumentType,
  type IDocumentDto,
  type ICreateDocumentItemDto,
  type ICreateDocumentTaxDto,
  type IUpdateDocumentDto,
} from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n/language-provider';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/document-options';

interface EditDocumentModalProps {
  readonly doc: IDocumentDto | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

interface ItemRow {
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  total: string;
}

interface FormState {
  documentType: DocumentType;
  razonSocialEmisor: string;
  fechaEmision: string;
  subtotal: string;
  iva: string;
  total: string;
  items: ItemRow[];
}

function toForm(doc: IDocumentDto): FormState {
  return {
    documentType: doc.documentType,
    razonSocialEmisor: doc.razonSocialEmisor ?? '',
    fechaEmision: doc.fechaEmision ?? '',
    subtotal: String(doc.subtotal),
    iva: String(doc.iva),
    total: String(doc.total),
    items: doc.items.map((i) => ({
      descripcion: i.descripcion,
      cantidad: String(i.cantidad),
      precioUnitario: String(i.precioUnitario),
      total: String(i.total),
    })),
  };
}

export function EditDocumentModal({ doc, onClose, onSaved }: EditDocumentModalProps) {
  const { apiPut } = useApi();
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(doc ? toForm(doc) : null);
    setError(null);
  }, [doc]);

  const set = (field: keyof FormState, value: string) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const setItem = (index: number, field: keyof ItemRow, value: string) =>
    setForm((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
          }
        : prev,
    );

  const addItem = () =>
    setForm((prev) =>
      prev
        ? { ...prev, items: [...prev.items, { descripcion: '', cantidad: '1', precioUnitario: '', total: '' }] }
        : prev,
    );

  const removeItem = (index: number) =>
    setForm((prev) => (prev ? { ...prev, items: prev.items.filter((_, i) => i !== index) } : prev));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc || !form) return;
    setSaving(true);
    setError(null);
    try {
      const items: ICreateDocumentItemDto[] = form.items
        .filter((it) => it.descripcion.trim() !== '')
        .map((it) => ({
          descripcion: it.descripcion.trim(),
          cantidad: Number(it.cantidad) || 0,
          precioUnitario: Number(it.precioUnitario) || 0,
          total: Number(it.total) || 0,
        }));

      const subtotal = Number(form.subtotal) || 0;
      const iva = Number(form.iva) || 0;
      const taxes: ICreateDocumentTaxDto[] = [];
      if (iva > 0) {
        taxes.push({
          codigo: '2',
          tarifa: subtotal > 0 ? Math.round((iva / subtotal) * 100) : 0,
          baseImponible: subtotal,
          valor: iva,
        });
      }

      const dto: IUpdateDocumentDto = {
        documentType: form.documentType,
        razonSocialEmisor: form.razonSocialEmisor.trim() || undefined,
        fechaEmision: form.fechaEmision.trim() || undefined,
        subtotal,
        iva,
        total: Number(form.total) || 0,
        items,
        taxes,
      };
      await apiPut<IDocumentDto>(`/documents/${doc.id}`, dto);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('common.unexpectedError'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={doc !== null} title={t('documents.edit.title')} onClose={onClose}>
      {doc && form && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Alert tone="info">
            {t('documents.edit.identity', { ruc: doc.rucEmisor, numero: doc.numeroFactura })}
          </Alert>

          <Field label={t('documents.form.type')}>
            <Select value={form.documentType} onChange={(e) => set('documentType', e.target.value)}>
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('documents.form.razon')}>
            <Input
              value={form.razonSocialEmisor}
              onChange={(e) => set('razonSocialEmisor', e.target.value)}
            />
          </Field>
          <Field label={t('documents.form.fecha')}>
            <Input
              value={form.fechaEmision}
              onChange={(e) => set('fechaEmision', e.target.value)}
              placeholder="2026-07-07"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t('documents.form.subtotal')}>
              <Input type="number" step="0.01" value={form.subtotal} onChange={(e) => set('subtotal', e.target.value)} />
            </Field>
            <Field label={t('documents.form.iva')}>
              <Input type="number" step="0.01" value={form.iva} onChange={(e) => set('iva', e.target.value)} />
            </Field>
            <Field label={t('documents.form.total')}>
              <Input type="number" step="0.01" value={form.total} onChange={(e) => set('total', e.target.value)} />
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{t('documents.form.items')}</span>
              <button type="button" onClick={addItem} className="brutal-badge bg-primary">
                {t('documents.form.addItem')}
              </button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="brutal-card-sm flex flex-col gap-2 bg-secondary p-3">
                <Input
                  placeholder={t('documents.form.item.desc')}
                  value={item.descripcion}
                  onChange={(e) => setItem(i, 'descripcion', e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" step="0.01" placeholder={t('documents.form.item.qty')} value={item.cantidad} onChange={(e) => setItem(i, 'cantidad', e.target.value)} />
                  <Input type="number" step="0.01" placeholder={t('documents.form.item.price')} value={item.precioUnitario} onChange={(e) => setItem(i, 'precioUnitario', e.target.value)} />
                  <Input type="number" step="0.01" placeholder={t('documents.form.item.total')} value={item.total} onChange={(e) => setItem(i, 'total', e.target.value)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="brutal-badge w-fit bg-[var(--color-danger)] text-white"
                >
                  {t('documents.form.removeItem')}
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? t('common.saving') : t('documents.edit.save')}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
