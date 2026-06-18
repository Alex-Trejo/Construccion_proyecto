/**
 * @fileoverview API Client — Peticiones autenticadas al API Gateway.
 *
 * Hook personalizado `useApi` que:
 *   1. Inyecta automáticamente `Authorization: Bearer <keycloak_token>`.
 *   2. Prefija la URL con NEXT_PUBLIC_API_GATEWAY_URL.
 *   3. Maneja errores HTTP de forma consistente.
 *
 * @module api-client
 */

import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? 'http://localhost:3001';

interface ApiOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

interface ApiError {
  status: number;
  message: string;
}

/**
 * Hook para realizar peticiones autenticadas al API Gateway.
 *
 * @example
 * ```tsx
 * const { apiGet, apiPost } = useApi();
 * const data = await apiGet('/communications?page=1&limit=10');
 * ```
 */
export function useApi() {
  const { data: session } = useSession();

  const apiFetch = useCallback(
    async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
      const url = `${API_BASE_URL}${endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Inyectar token de Keycloak
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: `Error ${response.status}: ${response.statusText}`,
        };

        try {
          const body = await response.json();
          error.message = body.message ?? error.message;
        } catch {
          // Si no es JSON, usar statusText
        }

        throw error;
      }

      return response.json() as Promise<T>;
    },
    [session],
  );

  const apiGet = useCallback(
    <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'GET' }),
    [apiFetch],
  );

  const apiPost = useCallback(
    <T>(endpoint: string, body: unknown) =>
      apiFetch<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    [apiFetch],
  );

  return { apiFetch, apiGet, apiPost, isAuthenticated: !!session?.accessToken };
}
