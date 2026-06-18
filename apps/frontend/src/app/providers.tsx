/**
 * @fileoverview Providers wrapper — NextAuth SessionProvider.
 * Envuelve la app para que useSession() funcione en componentes client.
 * @module providers
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
