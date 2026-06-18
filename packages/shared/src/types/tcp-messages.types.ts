/**
 * @fileoverview Tipos genéricos para la comunicación TCP entre microservicios.
 *
 * Estos tipos envuelven los payloads y respuestas TCP para garantizar
 * tipado estricto en toda la cadena: Gateway → Microservicio → Respuesta.
 *
 * @module TcpTypes
 */

/**
 * Wrapper genérico para payloads enviados vía TCP.
 * Incluye metadata de trazabilidad para observabilidad.
 *
 * @typeParam T - Tipo del payload (ej: ICreateSupplierDto).
 */
export interface TcpPayload<T> {
  /** Payload de datos enviado al microservicio. */
  readonly data: T;

  /** Metadata de trazabilidad de la petición. */
  readonly metadata: TcpRequestMetadata;
}

/**
 * Wrapper genérico para respuestas TCP desde un microservicio.
 *
 * @typeParam T - Tipo del dato de respuesta (ej: ISupplier).
 */
export interface TcpResponse<T> {
  /** Indica si la operación fue exitosa. */
  readonly success: boolean;

  /** Dato de respuesta. Null si hubo error. */
  readonly data: T | null;

  /** Mensaje de error si la operación falló. */
  readonly error: TcpErrorDetail | null;

  /** Timestamp ISO 8601 de la respuesta. */
  readonly timestamp: string;
}

/**
 * Metadata adjunta a cada petición TCP para trazabilidad.
 */
export interface TcpRequestMetadata {
  /** ID de correlación para distributed tracing. */
  readonly correlationId: string;

  /** ID del usuario autenticado que originó la petición. */
  readonly userId: string;

  /** Timestamp ISO 8601 de la petición. */
  readonly timestamp: string;
}

/**
 * Detalle de error en respuestas TCP.
 */
export interface TcpErrorDetail {
  /** Código de error interno (ej: 'SUPPLIER_NOT_FOUND'). */
  readonly code: string;

  /** Mensaje descriptivo del error. */
  readonly message: string;

  /** Detalles adicionales (ej: campos de validación fallidos). */
  readonly details?: ReadonlyArray<string>;
}

/**
 * Respuesta paginada genérica para listados.
 *
 * @typeParam T - Tipo de cada elemento en la lista.
 */
export interface PaginatedResponse<T> {
  /** Lista de elementos de la página actual. */
  readonly items: ReadonlyArray<T>;

  /** Metadata de paginación. */
  readonly pagination: PaginationMeta;
}

/**
 * Metadata de paginación.
 */
export interface PaginationMeta {
  /** Número total de elementos. */
  readonly totalItems: number;

  /** Número total de páginas. */
  readonly totalPages: number;

  /** Página actual (1-indexed). */
  readonly currentPage: number;

  /** Elementos por página. */
  readonly itemsPerPage: number;
}
