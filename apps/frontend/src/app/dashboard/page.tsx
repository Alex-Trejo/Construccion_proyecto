/**
 * @fileoverview Dashboard — Overview (vista protegida de bienvenida).
 *
 * Client component: consume la sesión vía `useSession()` y el idioma activo
 * vía `useTranslation()` para soportar el cambio ES/EN (PC-001).
 *
 * @module DashboardOverview
 */

'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n/language-provider';

export default function DashboardOverview() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const name = session?.user?.name ?? session?.user?.email ?? 'there';

  return (
    <div className="flex flex-col gap-8">
      <section className="brutal-card bg-primary p-8">
        <span className="brutal-badge bg-white">{t('overview.badge')}</span>
        <h1 className="mt-4 text-4xl font-bold">
          {t('overview.welcome', { name })}
        </h1>
        <p className="mt-2 max-w-xl text-dark/70">{t('overview.desc')}</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <ModuleCard
          href="/dashboard/suppliers"
          title={t('overview.card.suppliers.title')}
          desc={t('overview.card.suppliers.desc')}
          cta={t('overview.card.suppliers.cta')}
        />
        <ModuleCard
          href="/dashboard/communications"
          title={t('overview.card.communications.title')}
          desc={t('overview.card.communications.desc')}
          cta={t('overview.card.communications.cta')}
        />
      </section>
    </div>
  );
}

function ModuleCard({
  href,
  title,
  desc,
  cta,
}: Readonly<{
  href: string;
  title: string;
  desc: string;
  cta: string;
}>) {
  return (
    <Link href={href} className="brutal-card block bg-white p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-dark/70">{desc}</p>
      <p className="mt-4 font-bold">{cta}</p>
    </Link>
  );
}
