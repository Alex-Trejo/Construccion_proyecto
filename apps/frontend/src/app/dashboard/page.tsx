/**
 * @fileoverview Dashboard — Overview con KPIs reales.
 *
 * Muestra el hero de bienvenida + métricas del backend:
 *   GET /dashboard/metrics → IDashboardMetrics (total gastado, nº comprobantes,
 *   por estado, por mes). Gráficos con CSS puro (BarList), sin dependencias.
 *
 * @module DashboardOverview
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { IDashboardMetrics } from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n/language-provider';
import { StatCard } from '@/components/ui/StatCard';
import { BarList, type BarItem } from '@/components/ui/BarList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatMoney, statusBarClass } from '@/lib/format';
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/document-options';

interface Filters {
  desde: string;
  hasta: string;
  documentType: string;
}

const EMPTY_FILTERS: Filters = { desde: '', hasta: '', documentType: '' };

export default function DashboardOverview() {
  const { data: session } = useSession();
  const { apiGet } = useApi();
  const { t } = useTranslation();
  const name = session?.user?.name ?? session?.user?.email ?? 'there';

  const [metrics, setMetrics] = useState<IDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const load = useCallback(
    async (f: Filters) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (f.desde) qs.set('desde', f.desde);
        if (f.hasta) qs.set('hasta', f.hasta);
        if (f.documentType) qs.set('documentType', f.documentType);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        const data = await apiGet<IDashboardMetrics>(`/dashboard/metrics${suffix}`);
        setMetrics(data);
      } catch {
        setError(t('dashboard.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [apiGet, t],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(EMPTY_FILTERS);
  }, [load]);

  const setF = (k: keyof Filters, v: string) => setFilters((p) => ({ ...p, [k]: v }));
  const applyFilters = () => void load(filters);
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    void load(EMPTY_FILTERS);
  };

  const monthBars: ReadonlyArray<BarItem> = (metrics?.porMes ?? []).map((m) => ({
    label: m.mes,
    value: m.total,
    display: formatMoney(m.total),
  }));

  const statusBars: ReadonlyArray<BarItem> = (metrics?.porEstado ?? []).map((s) => ({
    label: s.estado,
    value: s.cantidad,
    display: t('dashboard.docsUnit', { n: s.cantidad }),
    barClass: statusBarClass(s.estado),
  }));

  return (
    <div className="flex flex-col gap-8">
      <section className="brutal-card bg-primary p-8">
        <span className="brutal-badge bg-white">{t('overview.badge')}</span>
        <h1 className="mt-4 text-4xl font-bold">{t('overview.welcome', { name })}</h1>
        <p className="mt-2 max-w-xl text-dark/70">{t('overview.desc')}</p>
      </section>

      {/* ── Filtros (RF07) ───────────────────────────────────────────────── */}
      <section className="brutal-card-sm grid items-end gap-3 bg-white p-4 sm:grid-cols-4">
        <Field label={t('dashboard.filter.desde')}>
          <Input type="date" value={filters.desde} onChange={(e) => setF('desde', e.target.value)} />
        </Field>
        <Field label={t('dashboard.filter.hasta')}>
          <Input type="date" value={filters.hasta} onChange={(e) => setF('hasta', e.target.value)} />
        </Field>
        <Field label={t('dashboard.filter.tipo')}>
          <Select
            value={filters.documentType}
            onChange={(e) => setF('documentType', e.target.value)}
          >
            <option value="">{t('dashboard.filter.allTypes')}</option>
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button variant="primary" onClick={applyFilters} disabled={loading}>
            {t('dashboard.filter.apply')}
          </Button>
          <Button variant="secondary" onClick={clearFilters} disabled={loading}>
            {t('dashboard.filter.clear')}
          </Button>
        </div>
      </section>

      {error && <Alert tone="error">{error}</Alert>}

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <section className="grid gap-6 sm:grid-cols-2">
        <StatCard
          label={t('dashboard.totalSpent')}
          value={loading ? '…' : formatMoney(metrics?.totalGastado ?? 0)}
          highlight
        />
        <StatCard
          label={t('dashboard.totalDocs')}
          value={loading ? '…' : String(metrics?.totalComprobantes ?? 0)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <BarList
          title={t('dashboard.byMonth')}
          items={monthBars}
          emptyText={t('dashboard.empty')}
        />
        <BarList
          title={t('dashboard.byStatus')}
          items={statusBars}
          emptyText={t('dashboard.empty')}
        />
      </section>

      {/* ── Accesos rápidos ──────────────────────────────────────────────── */}
      <section className="grid gap-6 md:grid-cols-3">
        <ModuleCard
          href="/dashboard/documents"
          title={t('documents.title')}
          cta={t('documents.badge')}
        />
        <ModuleCard
          href="/dashboard/suppliers"
          title={t('overview.card.suppliers.title')}
          cta={t('overview.card.suppliers.cta')}
        />
        <ModuleCard
          href="/dashboard/communications"
          title={t('overview.card.communications.title')}
          cta={t('overview.card.communications.cta')}
        />
      </section>
    </div>
  );
}

function ModuleCard({ href, title, cta }: Readonly<{ href: string; title: string; cta: string }>) {
  return (
    <Link href={href} className="brutal-card block bg-white p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-4 font-bold">{cta} →</p>
    </Link>
  );
}
