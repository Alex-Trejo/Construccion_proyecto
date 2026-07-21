/**
 * @fileoverview Modal de edición de proveedor.
 * Construye un IUpdateSupplierDto (parcial: contacto + campos PN/PJ; NO tipo ni
 * taxId) → PUT /suppliers/:id.
 * @module suppliers/EditSupplierModal
 */

'use client';

import { useEffect, useState } from 'react';
import {
  SupplierType,
  type ISupplier,
  type IUpdateSupplierDto,
} from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n/language-provider';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

interface EditSupplierModalProps {
  readonly supplier: ISupplier | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

interface EditState {
  email: string;
  phone: string;
  address: string;
  firstName: string;
  lastName: string;
  businessName: string;
  tradeName: string;
  legalRepresentative: string;
}

function toEditState(s: ISupplier): EditState {
  const base = { email: s.email, phone: s.phone, address: s.address };
  if (s.supplierType === SupplierType.PERSONA_NATURAL) {
    return {
      ...base,
      firstName: s.firstName,
      lastName: s.lastName,
      businessName: '',
      tradeName: '',
      legalRepresentative: '',
    };
  }
  return {
    ...base,
    firstName: '',
    lastName: '',
    businessName: s.businessName,
    tradeName: s.tradeName,
    legalRepresentative: s.legalRepresentative,
  };
}

export function EditSupplierModal({ supplier, onClose, onSaved }: EditSupplierModalProps) {
  const { apiPut } = useApi();
  const { t } = useTranslation();
  const [form, setForm] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(supplier ? toEditState(supplier) : null);
    setError(null);
  }, [supplier]);

  const set = (field: keyof EditState, value: string) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !form) return;
    setSaving(true);
    setError(null);
    try {
      const dto: IUpdateSupplierDto =
        supplier.supplierType === SupplierType.PERSONA_NATURAL
          ? {
              email: form.email.trim(),
              phone: form.phone.trim(),
              address: form.address.trim(),
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
            }
          : {
              email: form.email.trim(),
              phone: form.phone.trim(),
              address: form.address.trim(),
              businessName: form.businessName.trim(),
              tradeName: form.tradeName.trim(),
              legalRepresentative: form.legalRepresentative.trim(),
            };
      await apiPut<ISupplier>(`/suppliers/${supplier.id}`, dto);
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

  const isNatural = supplier?.supplierType === SupplierType.PERSONA_NATURAL;

  return (
    <Modal open={supplier !== null} title={t('suppliers.editTitle')} onClose={onClose}>
      {form && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}

          {isNatural ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('suppliers.firstName')}>
                <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value.replace(/\d/g, ''))} />
              </Field>
              <Field label={t('suppliers.lastName')}>
                <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value.replace(/\d/g, ''))} />
              </Field>
            </div>
          ) : (
            <>
              <Field label={t('suppliers.businessName')}>
                <Input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
              </Field>
              <Field label={t('suppliers.tradeName')}>
                <Input value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} />
              </Field>
              <Field label={t('suppliers.legalRep')}>
                <Input
                  value={form.legalRepresentative}
                  onChange={(e) => set('legalRepresentative', e.target.value)}
                />
              </Field>
            </>
          )}

          <Field label={t('suppliers.email')}>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label={t('suppliers.phone')}>
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={10}
            />
          </Field>
          <Field label={t('suppliers.address')}>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? t('common.saving') : t('suppliers.save')}
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
