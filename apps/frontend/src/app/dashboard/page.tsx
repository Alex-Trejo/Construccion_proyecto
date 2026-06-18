/**
 * @fileoverview Dashboard — Overview (vista protegida de bienvenida).
 * @module DashboardOverview
 */

import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? session?.user?.email ?? 'there';

  return (
    <div className="flex flex-col gap-8">
      <section className="brutal-card bg-primary p-8">
        <span className="brutal-badge bg-white">Dashboard</span>
        <h1 className="mt-4 text-4xl font-bold">Welcome back, {name} 👋</h1>
        <p className="mt-2 max-w-xl text-dark/70">
          Manage your suppliers and review the electronic receipts received
          through the automated SRI pipeline.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <ModuleCard
          href="/dashboard/suppliers"
          title="Suppliers"
          desc="Register natural or legal persons. The backend Factory Method generates the dynamic supplier code."
          cta="Manage suppliers →"
        />
        <ModuleCard
          href="/dashboard/communications"
          title="Communications"
          desc="Browse received emails and download attachments directly from secure object storage."
          cta="View communications →"
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
}: {
  href: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link href={href} className="brutal-card block bg-white p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-dark/70">{desc}</p>
      <p className="mt-4 font-bold">{cta}</p>
    </Link>
  );
}
