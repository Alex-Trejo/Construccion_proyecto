/**
 * @fileoverview Root layout — SGC Frontend.
 *
 * Carga la fuente Space Grotesk, el SessionProvider de NextAuth,
 * y las hojas de estilo globales.
 *
 * @module RootLayout
 */

import type { Metadata } from 'next';
import { Providers } from './providers';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'SGC — Sistema de Gestión de Comprobantes',
  description:
    'Plataforma inteligente para la gestión automatizada de comprobantes electrónicos del SRI ecuatoriano.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={spaceGrotesk.className}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
