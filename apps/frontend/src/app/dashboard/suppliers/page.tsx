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
import { Button } from '@/components/ui/Button';

interface FormState {
  supplierType: SupplierType;
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
  const { apiGet, apiPost } = useApi();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [suppliers, setSuppliers] = useState<ReadonlyArray<ISupplier>>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const isNatural = form.supplierType === SupplierType.PERSONA_NATURAL;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSuppliers();
  }, [loadSuppliers]);

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const created = await apiPost<ISupplier>('/suppliers', buildDto(form));
      setMessage({
        ok: true,
        text: `✅ Created: ${displayName(created)} — code ${created.supplierCode}`,
      });
      setForm(EMPTY_FORM);
      await loadSuppliers();
    } catch (err) {
      const text =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Unexpected error';
      setMessage({ ok: false, text: `❌ ${text}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <span className="brutal-badge w-fit bg-primary">Suppliers</span>
        <h1 className="text-3xl font-bold">Register a supplier</h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Form ───────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="brutal-card bg-white p-8">
          <div className="flex flex-col gap-4">
            <Field label="Supplier type">
              <select
                className="brutal-select"
                value={form.supplierType}
                onChange={(e) =>
                  update('supplierType', e.target.value as SupplierType)
                }
              >
                <option value={SupplierType.PERSONA_JURIDICA}>
                  Persona Jurídica (company)
                </option>
                <option value={SupplierType.PERSONA_NATURAL}>
                  Persona Natural (individual)
                </option>
              </select>
            </Field>

            <Field label="RUC / Cédula (taxId)">
              <input
                className="brutal-input"
                value={form.taxId}
                onChange={(e) => update('taxId', e.target.value)}
                placeholder="1790012345001"
                required
              />
            </Field>

            {isNatural ? (
              <>
                <Field label="First name">
                  <input
                    className="brutal-input"
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Last name">
                  <input
                    className="brutal-input"
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Cédula">
                  <input
                    className="brutal-input"
                    value={form.cedula}
                    onChange={(e) => update('cedula', e.target.value)}
                    placeholder="1710034065"
                    required
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Business name">
                  <input
                    className="brutal-input"
                    value={form.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Trade name">
                  <input
                    className="brutal-input"
                    value={form.tradeName}
                    onChange={(e) => update('tradeName', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Legal representative">
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

            <Field label="Email">
              <input
                type="email"
                className="brutal-input"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <input
                className="brutal-input"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </Field>
            <Field label="Address">
              <input
                className="brutal-input"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </Field>

            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create supplier'}
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

        {/* ── List ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Registered suppliers</h2>
          {loading ? (
            <p className="text-dark/60">Loading…</p>
          ) : suppliers.length === 0 ? (
            <div className="brutal-card-sm bg-white p-6 text-dark/60">
              No suppliers yet.
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
                  <p className="mt-1 text-sm text-dark/60">RUC: {s.taxId}</p>
                  <p className="text-sm font-mono text-dark/80">
                    {s.supplierCode}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
