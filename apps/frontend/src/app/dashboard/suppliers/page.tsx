/**
 * @fileoverview Módulo Proveedores — formulario de creación + listado.
 *
 * El selector de tipo (PERSONA_NATURAL / PERSONA_JURIDICA) decide qué campos
 * se envían. Al hacer submit, POST /suppliers dispara el Factory Method en
 * ms-core, que genera el código dinámico (PROV-NAT/JUR-YYYY-xxxxxxxx).
 *
 * @module SuppliersPage
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  SupplierType,
  type ICreateSupplierDto,
  type ISupplier,
} from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useRoles } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/language-provider';
import { EditSupplierModal } from '@/components/suppliers/EditSupplierModal';

/** Función traductora provista por el provider i18n. */
type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Tipo de documento de identificación tributaria. */
type DocumentType = 'CEDULA' | 'RUC';

/** Longitud exacta de dígitos por tipo de documento (SRI Ecuador). */
const DOC_LENGTH: Record<DocumentType, number> = {
  CEDULA: 10,
  RUC: 13,
};

interface FormState {
  supplierType: SupplierType;
  documentType: DocumentType;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  // Persona Natural
  firstName: string;
  lastName: string;
  cedula: string;
  // Persona Jurídica
  businessName: string;
  tradeName: string;
  legalRepresentative: string;
}

const EMPTY_FORM: FormState = {
  supplierType: SupplierType.PERSONA_JURIDICA,
  documentType: 'RUC',
  taxId: '',
  email: '',
  phone: '',
  address: '',
  firstName: '',
  lastName: '',
  cedula: '',
  businessName: '',
  tradeName: '',
  legalRepresentative: '',
};

/** Elimina cualquier carácter no numérico (usado en RUC/Cédula y Teléfono). */
function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Elimina dígitos (nombres/apellidos no pueden contener números). */
function noDigits(value: string): string {
  return value.replace(/\d/g, '');
}

/**
 * Valida los campos numéricos antes de enviar (PC-002).
 * Retorna un mensaje de error traducido o `null` si todo es válido.
 */
function validateNumericFields(form: FormState, t: Translate): string | null {
  const taxId = form.taxId.trim();
  if (!/^\d+$/.test(taxId)) {
    return t('suppliers.err.taxIdNumeric');
  }
  const expectedLength = DOC_LENGTH[form.documentType];
  if (taxId.length !== expectedLength) {
    const docLabel =
      form.documentType === 'CEDULA'
        ? t('suppliers.doc.cedula')
        : t('suppliers.doc.ruc');
    return t('suppliers.err.taxIdLength', { doc: docLabel, n: expectedLength });
  }

  if (form.supplierType === SupplierType.PERSONA_NATURAL) {
    const cedula = form.cedula.trim();
    if (!/^\d{10}$/.test(cedula)) {
      return t('suppliers.err.cedula');
    }
  }

  const phone = form.phone.trim();
  if (phone !== '' && !/^\d{7,10}$/.test(phone)) {
    return t('suppliers.err.phone');
  }

  return null;
}

function buildDto(form: FormState): ICreateSupplierDto {
  const base = {
    taxId: form.taxId.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
  };

  if (form.supplierType === SupplierType.PERSONA_NATURAL) {
    return {
      ...base,
      supplierType: SupplierType.PERSONA_NATURAL,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      cedula: form.cedula.trim(),
    };
  }

  return {
    ...base,
    supplierType: SupplierType.PERSONA_JURIDICA,
    businessName: form.businessName.trim(),
    tradeName: form.tradeName.trim(),
    legalRepresentative: form.legalRepresentative.trim(),
  };
}

function displayName(s: ISupplier): string {
  return s.supplierType === SupplierType.PERSONA_NATURAL
    ? `${s.lastName} ${s.firstName}`.trim()
    : s.businessName;
}

export default function SuppliersPage() {
  const { apiGet, apiPost, apiDelete } = useApi();
  const { canOperate } = useRoles();
  const canWrite = canOperate;
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [suppliers, setSuppliers] = useState<ReadonlyArray<ISupplier>>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<ISupplier | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const isNatural = form.supplierType === SupplierType.PERSONA_NATURAL;

  const handleDelete = async (supplier: ISupplier) => {
    if (!window.confirm(t('suppliers.confirmDelete', { name: displayName(supplier) }))) {
      return;
    }
    setDeleting(supplier.id);
    try {
      await apiDelete(`/suppliers/${supplier.id}`);
      setMessage({ ok: true, text: t('suppliers.deleted') });
      await loadSuppliers();
    } catch (err) {
      const text =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('suppliers.unexpectedError');
      setMessage({ ok: false, text: `❌ ${text}` });
    } finally {
      setDeleting(null);
    }
  };

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ReadonlyArray<ISupplier>>('/suppliers');
      setSuppliers(data);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [apiGet]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateNumericFields(form, t);
    if (validationError) {
      setMessage({ ok: false, text: `❌ ${validationError}` });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const created = await apiPost<ISupplier>('/suppliers', buildDto(form));
      setMessage({
        ok: true,
        text: t('suppliers.created', {
          name: displayName(created),
          code: created.supplierCode,
        }),
      });
      setForm(EMPTY_FORM);
      await loadSuppliers();
    } catch (err) {
      const text =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('suppliers.unexpectedError');
      setMessage({ ok: false, text: `❌ ${text}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <span className="brutal-badge w-fit bg-primary">
          {t('suppliers.badge')}
        </span>
        <h1 className="text-3xl font-bold">{t('suppliers.title')}</h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Form (solo Administrador/Contador) ─────────────────────────── */}
        {canWrite && (
        <form onSubmit={handleSubmit} className="brutal-card bg-white p-8">
          <div className="flex flex-col gap-4">
            <Field label={t('suppliers.supplierType')}>
              <select
                className="brutal-select"
                value={form.supplierType}
                onChange={(e) =>
                  update('supplierType', e.target.value as SupplierType)
                }
              >
                <option value={SupplierType.PERSONA_JURIDICA}>
                  {t('suppliers.opt.juridica')}
                </option>
                <option value={SupplierType.PERSONA_NATURAL}>
                  {t('suppliers.opt.natural')}
                </option>
              </select>
            </Field>

            <Field label={t('suppliers.documentType')}>
              <select
                className="brutal-select"
                value={form.documentType}
                onChange={(e) =>
                  update('documentType', e.target.value as DocumentType)
                }
              >
                <option value="CEDULA">{t('suppliers.opt.cedula')}</option>
                <option value="RUC">{t('suppliers.opt.ruc')}</option>
              </select>
            </Field>

            <Field label={t('suppliers.taxId')}>
              <input
                className="brutal-input"
                value={form.taxId}
                onChange={(e) => update('taxId', onlyDigits(e.target.value))}
                inputMode="numeric"
                pattern="\d*"
                maxLength={DOC_LENGTH[form.documentType]}
                placeholder={
                  form.documentType === 'CEDULA' ? '1710034065' : '1790012345001'
                }
                required
              />
            </Field>

            {isNatural ? (
              <>
                <Field label={t('suppliers.firstName')}>
                  <input
                    className="brutal-input"
                    value={form.firstName}
                    onChange={(e) => update('firstName', noDigits(e.target.value))}
                    required
                  />
                </Field>
                <Field label={t('suppliers.lastName')}>
                  <input
                    className="brutal-input"
                    value={form.lastName}
                    onChange={(e) => update('lastName', noDigits(e.target.value))}
                    required
                  />
                </Field>
                <Field label={t('suppliers.cedula')}>
                  <input
                    className="brutal-input"
                    value={form.cedula}
                    onChange={(e) => update('cedula', onlyDigits(e.target.value))}
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={10}
                    placeholder="1710034065"
                    required
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label={t('suppliers.businessName')}>
                  <input
                    className="brutal-input"
                    value={form.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                    required
                  />
                </Field>
                <Field label={t('suppliers.tradeName')}>
                  <input
                    className="brutal-input"
                    value={form.tradeName}
                    onChange={(e) => update('tradeName', e.target.value)}
                    required
                  />
                </Field>
                <Field label={t('suppliers.legalRep')}>
                  <input
                    className="brutal-input"
                    value={form.legalRepresentative}
                    onChange={(e) =>
                      update('legalRepresentative', e.target.value)
                    }
                    required
                  />
                </Field>
              </>
            )}

            <Field label={t('suppliers.email')}>
              <input
                type="email"
                className="brutal-input"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
            <Field label={t('suppliers.phone')}>
              <input
                className="brutal-input"
                value={form.phone}
                onChange={(e) => update('phone', onlyDigits(e.target.value))}
                inputMode="numeric"
                pattern="\d*"
                maxLength={10}
              />
            </Field>
            <Field label={t('suppliers.address')}>
              <input
                className="brutal-input"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </Field>

            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? t('suppliers.creating') : t('suppliers.create')}
            </Button>

            {message && (
              <p
                className={`brutal-card-sm p-3 text-sm font-medium ${
                  message.ok ? 'bg-primary' : 'bg-[var(--color-danger)]'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        </form>
        )}

        {/* ── List ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">{t('suppliers.listTitle')}</h2>
          {loading ? (
            <p className="text-dark/60">{t('suppliers.loading')}</p>
          ) : suppliers.length === 0 ? (
            <div className="brutal-card-sm bg-white p-6 text-dark/60">
              {t('suppliers.empty')}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {suppliers.map((s) => (
                <div key={s.id} className="brutal-card-sm bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{displayName(s)}</p>
                    <span className="brutal-badge bg-primary">
                      {s.supplierType === SupplierType.PERSONA_NATURAL
                        ? 'NAT'
                        : 'JUR'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-dark/60">
                    {t('suppliers.rucLabel')} {s.taxId}
                  </p>
                  <p className="text-sm font-mono text-dark/80">
                    {s.supplierCode}
                  </p>
                  {canWrite && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setEditing(s)}
                        className="brutal-badge bg-secondary"
                      >
                        {t('suppliers.edit')}
                      </button>
                      <button
                        onClick={() => void handleDelete(s)}
                        disabled={deleting === s.id}
                        className="brutal-badge bg-[var(--color-danger)] text-white disabled:opacity-50"
                      >
                        {deleting === s.id ? t('common.deleting') : t('suppliers.delete')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditSupplierModal
        supplier={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setMessage({ ok: true, text: t('suppliers.updated') });
          void loadSuppliers();
        }}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
