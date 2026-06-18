/**
 * @fileoverview Barra de navegación del dashboard (client).
 * Muestra los enlaces de módulos, el usuario y el sign-out.
 * @module DashboardNav
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

const LINKS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/suppliers', label: 'Suppliers' },
  { href: '/dashboard/communications', label: 'Communications' },
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

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
          {LINKS.map((link) => {
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
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-dark/70 sm:inline">
            {session?.user?.name ?? session?.user?.email ?? 'User'}
          </span>
          <Button
            variant="secondary"
            onClick={() => void signOut({ callbackUrl: '/' })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </nav>
  );
}
