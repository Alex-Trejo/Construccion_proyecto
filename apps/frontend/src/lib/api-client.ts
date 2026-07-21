/**
 * @fileoverview API Client — Peticiones autenticadas al API Gateway.
 *
 * Hook personalizado `useApi` que:
 *   1. Inyecta automáticamente `Authorization: Bearer <keycloak_token>`.
 *   2. Prefija la URL con NEXT_PUBLIC_API_GATEWAY_URL (ya incluye `/api/v1`).
 *   3. Maneja errores HTTP de forma consistente.
 *
 * Métodos:
 *   - apiGet / apiPost / apiPut / apiDelete → JSON in/out.
 *   - apiUpload → multipart/form-data (NO fija Content-Type; el browser pone
 *     el boundary). Para subir foto de comprobante (OCR) y TXT masivo.
 *   - apiDownload → descarga binaria (XLSX) como blob, sin abrir pestaña nueva.
 *
 * @module api-client
 */

import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

// En dev, `.env.local` fija la URL absoluta del gateway (otro puerto → CORS).
// En producción NO se define: se usa la ruta RELATIVA `/api/v1`, que Caddy sirve
// en el mismo dominio que el frontend (sin CORS ni URL horneada en build).
const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? '/api/v1';

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
  // Dependemos del TOKEN (string), no del objeto `session`: así un re-fetch de la
  // sesión (p. ej. al volver el foco a la ventana) con el mismo token NO recrea
  // los callbacks ni dispara recargas espurias en las pantallas.
  const accessToken = session?.accessToken;

  const authHeader = useCallback((): Record<string, string> => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  /** Extrae el mensaje de error del cuerpo JSON (si lo hay). */
  const toError = useCallback(async (response: Response): Promise<ApiError> => {
    const error: ApiError = {
      status: response.status,
      message: `Error ${response.status}: ${response.statusText}`,
    };
    try {
      const body = await response.json();
      error.message = body.message ?? error.message;
    } catch {
      // Si no es JSON, se conserva statusText.
    }
    return error;
  }, []);

  const apiFetch = useCallback(
    async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
      const url = `${API_BASE_URL}${endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeader(),
        ...options.headers,
      };

      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        throw await toError(response);
      }

      return response.json() as Promise<T>;
    },
    [authHeader, toError],
  );

  const apiGet = useCallback(
    <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'GET' }),
    [apiFetch],
  );

  const apiPost = useCallback(
    <T>(endpoint: string, body: unknown) =>
      apiFetch<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    [apiFetch],
  );

  const apiPut = useCallback(
    <T>(endpoint: string, body: unknown) =>
      apiFetch<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    [apiFetch],
  );

  const apiPatch = useCallback(
    <T>(endpoint: string, body: unknown) =>
      apiFetch<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
    [apiFetch],
  );

  const apiDelete = useCallback(
    <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'DELETE' }),
    [apiFetch],
  );

  /**
   * Sube un archivo vía multipart/form-data.
   * NO fija Content-Type: el navegador añade el boundary automáticamente.
   */
  const apiUpload = useCallback(
    async <T>(endpoint: string, formData: FormData): Promise<T> => {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { ...authHeader() },
        body: formData,
      });
      if (!response.ok) {
        throw await toError(response);
      }
      return response.json() as Promise<T>;
    },
    [authHeader, toError],
  );

  /**
   * Descarga un recurso binario (p. ej. XLSX) como blob y dispara la descarga
   * en el navegador con el nombre de archivo indicado.
   */
  const apiDownload = useCallback(
    async (endpoint: string, filename: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: { ...authHeader() },
      });
      if (!response.ok) {
        throw await toError(response);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    },
    [authHeader, toError],
  );

  /**
   * Descarga un recurso protegido (con Bearer) y devuelve un object URL local
   * (blob:) para mostrarlo en un <iframe>/<img> o abrirlo en pestaña. El llamador
   * debe revocar el URL con URL.revokeObjectURL cuando ya no lo use.
   * Se usa para previsualizar archivos SIN exponer MinIO (proxy autenticado).
   */
  const apiBlobUrl = useCallback(
    async (endpoint: string): Promise<string> => {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: { ...authHeader() },
      });
      if (!response.ok) {
        throw await toError(response);
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    [authHeader, toError],
  );

  return {
    apiFetch,
    apiGet,
    apiPost,
    apiPut,
    apiPatch,
    apiDelete,
    apiUpload,
    apiDownload,
    apiBlobUrl,
    isAuthenticated: !!accessToken,
  };
}
