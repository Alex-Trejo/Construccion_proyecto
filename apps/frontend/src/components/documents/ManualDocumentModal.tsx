/**
 * @fileoverview Modal de creación manual de comprobante.
 * Construye un ICreateDocumentDto (con ítems dinámicos) → POST /documents.
 * @module documents/ManualDocumentModal
 */

'use client';

import { useState } from 'react';
import {
  DocumentType,
  type ICreateDocumentDto,
  type ICreateDocumentItemDto,
  type IDocumentDto,
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

interface ManualDocumentModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: (numero: string) => void;
}

interface ItemRow {
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  total: string;
}

interface FormState {
  documentType: DocumentType;
  rucEmisor: string;
  razonSocialEmisor: string;
  numeroFactura: string;
  claveAcceso: string;
  fechaEmision: string;
  subtotal: string;
  iva: string;
  total: string;
  items: ItemRow[];
}

const EMPTY_ITEM: ItemRow = { descripcion: '', cantidad: '1', precioUnitario: '', total: '' };

const EMPTY_FORM: FormState = {
  documentType: DocumentType.FACTURA,
  rucEmisor: '',
  razonSocialEmisor: '',
  numeroFactura: '',
  claveAcceso: '',
  fechaEmision: '',
  subtotal: '',
  iva: '',
  total: '',
  items: [{ ...EMPTY_ITEM }],
};

export function ManualDocumentModal({ open, onClose, onSaved }: ManualDocumentModalProps) {
  const { apiPost } = useApi();
  const { t } = useTranslation();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setSaving(false);
    onClose();
  };

  const set = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setItem = (index: number, field: keyof ItemRow, value: string) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    }));

  const addItem = () =>
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));

  const removeItem = (index: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const dto: ICreateDocumentDto = {
        documentType: form.documentType,
        rucEmisor: form.rucEmisor.trim(),
        razonSocialEmisor: form.razonSocialEmisor.trim() || undefined,
        numeroFactura: form.numeroFactura.trim(),
        claveAcceso: form.claveAcceso.trim() || undefined,
        fechaEmision: form.fechaEmision.trim() || undefined,
        subtotal: Number(form.subtotal) || 0,
        iva: Number(form.iva) || 0,
        total: Number(form.total) || 0,
        items,
        taxes: [],
      };
      await apiPost<IDocumentDto>('/documents', dto);
      onSaved(dto.numeroFactura);
      close();
    } catch (err) {
      const text =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('common.unexpectedError');
      setError(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={t('documents.form.title')} onClose={close}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}

        <Field label={t('documents.form.type')}>
          <Select
            value={form.documentType}
            onChange={(e) => set('documentType', e.target.value)}
          >
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('documents.form.ruc')} required>
          <Input value={form.rucEmisor} onChange={(e) => set('rucEmisor', e.target.value)} required />
        </Field>
        <Field label={t('documents.form.razon')}>
          <Input
            value={form.razonSocialEmisor}
            onChange={(e) => set('razonSocialEmisor', e.target.value)}
          />
        </Field>
        <Field label={t('documents.form.numero')} required>
          <Input
            value={form.numeroFactura}
            onChange={(e) => set('numeroFactura', e.target.value)}
            required
          />
        </Field>
        <Field label={t('documents.form.clave')}>
          <Input value={form.claveAcceso} onChange={(e) => set('claveAcceso', e.target.value)} />
        </Field>
        <Field label={t('documents.form.fecha')}>
          <Input
            value={form.fechaEmision}
            onChange={(e) => set('fechaEmision', e.target.value)}
            placeholder="2026-01-31"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label={t('documents.form.subtotal')}>
            <Input type="number" step="0.01" value={form.subtotal} onChange={(e) => set('subtotal', e.target.value)} />
          </Field>
          <Field label={t('documents.form.iva')}>
            <Input type="number" step="0.01" value={form.iva} onChange={(e) => set('iva', e.target.value)} />
          </Field>
          <Field label={t('documents.form.total')} required>
            <Input type="number" step="0.01" value={form.total} onChange={(e) => set('total', e.target.value)} required />
          </Field>
        </div>

        {/* ── Ítems dinámicos ────────────────────────────────────────────── */}
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
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t('documents.form.item.qty')}
                  value={item.cantidad}
                  onChange={(e) => setItem(i, 'cantidad', e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t('documents.form.item.price')}
                  value={item.precioUnitario}
                  onChange={(e) => setItem(i, 'precioUnitario', e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t('documents.form.item.total')}
                  value={item.total}
                  onChange={(e) => setItem(i, 'total', e.target.value)}
                />
              </div>
              {form.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="brutal-badge w-fit bg-[var(--color-danger)] text-white"
                >
                  {t('documents.form.removeItem')}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t('common.saving') : t('documents.form.save')}
          </Button>
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
