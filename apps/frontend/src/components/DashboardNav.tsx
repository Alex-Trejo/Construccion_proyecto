/**
 * @fileoverview Barra de navegación del dashboard (client).
 * Muestra los enlaces de módulos, el usuario y el sign-out.
 * @module DashboardNav
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from '@/lib/i18n/language-provider';
import { useRoles } from '@/lib/roles';

/** Enlaces visibles para cualquier usuario autenticado. */
const BASE_LINKS = [
  { href: '/dashboard', key: 'nav.overview' },
  { href: '/dashboard/documents', key: 'nav.documents' },
  { href: '/dashboard/suppliers', key: 'nav.suppliers' },
  { href: '/dashboard/communications', key: 'nav.communications' },
  { href: '/dashboard/settings/imap', key: 'nav.imap' },
] as const;

/** Enlaces sólo para el rol Administrador. */
const ADMIN_LINKS = [
  { href: '/dashboard/admin/users', key: 'nav.users' },
  { href: '/dashboard/admin/roles', key: 'nav.roles' },
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const { isAdmin } = useRoles();

  // Si el refresco del token falló (sesión SSO expirada tras inactividad
  // prolongada), se fuerza un nuevo login limpio en vez de mostrar errores.
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      void signIn('keycloak');
    }
  }, [session?.error]);

  const links = isAdmin ? [...BASE_LINKS, ...ADMIN_LINKS] : BASE_LINKS;

  return (
    <nav className="sticky top-0 z-10 border-b-2 border-black bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-black bg-primary font-extrabold">
            S
          </span>
          <span className="text-xl font-bold tracking-tight">SGC</span>
        </Link>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          {links.map((link) => {
            const active =
              link.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? 'border-black bg-primary'
                    : 'border-transparent hover:border-black'
                }`}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <span className="hidden text-sm font-medium text-dark/70 sm:inline">
            {session?.user?.name ?? session?.user?.email ?? t('nav.user')}
          </span>
          <Button
            variant="secondary"
            onClick={() => void signOut({ callbackUrl: '/' })}
          >
            {t('nav.signOut')}
          </Button>
        </div>
      </div>
    </nav>
  );
}
