/**
 * @fileoverview Hook de roles — gating de UI basado en los roles del realm
 * de Keycloak expuestos en la sesión de NextAuth ([auth-options]).
 *
 * Nombres de rol reales del realm `sgc-realm`: Administrador, Contador, Asistente.
 * El backend valida en cada petición (403); esto solo mejora la UX ocultando
 * lo que el usuario no puede usar.
 *
 * @module roles
 */

'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

/** Roles conocidos del realm. */
export const ROLES = {
  ADMIN: 'Administrador',
  CONTADOR: 'Contador',
  ASISTENTE: 'Asistente',
} as const;

export interface UseRolesResult {
  readonly roles: ReadonlyArray<string>;
  readonly isAdmin: boolean;
  readonly isContador: boolean;
  readonly isAsistente: boolean;
  /** Usuario operativo: puede subir, corregir OCR, crear/editar y validar. */
  readonly canOperate: boolean;
  readonly hasRole: (role: string) => boolean;
  readonly hasAnyRole: (...roles: string[]) => boolean;
}

/** Accede a los roles de la sesión y ofrece helpers de comprobación. */
export function useRoles(): UseRolesResult {
  const { data: session } = useSession();

  return useMemo(() => {
    const roles = session?.roles ?? [];
    const hasRole = (role: string) => roles.includes(role);
    const isAdmin = hasRole(ROLES.ADMIN);
    const isAsistente = hasRole(ROLES.ASISTENTE);
    return {
      roles,
      isAdmin,
      isContador: hasRole(ROLES.CONTADOR),
      isAsistente,
      canOperate: isAdmin || isAsistente,
      hasRole,
      hasAnyRole: (...wanted: string[]) => wanted.some((r) => roles.includes(r)),
    };
  }, [session]);
}
