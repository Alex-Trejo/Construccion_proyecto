/**
 * @fileoverview Layout protegido del dashboard.
 *
 * Doble protección: el `proxy.ts` ya bloquea por cookie, y aquí se valida
 * la sesión en el servidor (getServerSession). Si no hay sesión, redirige
 * a la landing. Renderiza la barra de navegación común.
 *
 * @module DashboardLayout
 */

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth-options';
import { DashboardNav } from '@/components/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-secondary">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
