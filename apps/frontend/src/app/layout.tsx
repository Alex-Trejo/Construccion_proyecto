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
import './globals.css';

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
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
