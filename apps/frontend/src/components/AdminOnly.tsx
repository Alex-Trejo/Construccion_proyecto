/**
 * @fileoverview Guard client-side para vistas de sólo-Administrador.
 *
 * - `<AdminOnly>` renderiza sus children únicamente si el usuario es admin.
 * - `<AdminGuard>` protege una PÁGINA entera: mientras carga la sesión muestra
 *   un placeholder; si el usuario no es admin, redirige a /dashboard.
 *
 * Es complementario a la validación del backend (403). No sustituye la
 * seguridad del servidor: solo mejora la experiencia ocultando lo no permitido.
 *
 * @module AdminOnly
 */

'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, type ReactNode } from 'react';
import { useRoles } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/language-provider';

/** Muestra `children` solo si el usuario tiene el rol Administrador. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useRoles();
  if (!isAdmin) return null;
  return <>{children}</>;
}

/** Protege una página completa: redirige a /dashboard si no es admin. */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const { isAdmin } = useRoles();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [status, isAdmin, router]);

  if (status === 'loading') {
    return <p className="text-dark/60">{t('common.loading')}</p>;
  }

  if (!isAdmin) {
    return (
      <div className="brutal-card-sm bg-[var(--color-danger)] p-6 font-semibold">
        {t('common.forbidden')}
      </div>
    );
  }

  return <>{children}</>;
}
