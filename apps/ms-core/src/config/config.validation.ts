/**
 * @fileoverview Esquema de validación Joi para las variables de entorno de ms-core.
 *
 * REGLA FAIL-FAST (NON-NEGOTIABLE):
 * ─────────────────────────────────
 * - TODAS las variables son `.required()`. No existen valores por defecto.
 * - Si falta UNA SOLA variable, la aplicación CRASHEA inmediatamente al arrancar.
 * - `abortEarly: false` → Reporta TODOS los errores de una sola vez (mejor DX).
 * - `allowUnknown: true` → Permite variables del sistema (PATH, HOME, etc.)
 *   que no están en el esquema.
 *
 * Uso:
 *   Se inyecta en `ConfigModule.forRoot()` dentro de `app.module.ts`.
 *
 * @module config.validation
 */

import * as Joi from 'joi';

/**
 * Esquema de validación estricto para las variables de entorno de ms-core.
 * Organizado por secciones funcionales.
 */
export const configValidationSchema = Joi.object({
  // ───────────────────────────────────────────────────────────────────────────
  // GENERAL
  // ───────────────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .required()
    .messages({
      'any.required': 'NODE_ENV es obligatorio (development | production | test)',
      'any.only': 'NODE_ENV debe ser uno de: development, production, test',
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // POSTGRESQL — Conexión a la base de datos
  // ───────────────────────────────────────────────────────────────────────────
  POSTGRES_HOST: Joi.string()
    .hostname()
    .required()
    .messages({
      'any.required': 'POSTGRES_HOST es obligatorio. Ej: localhost o sgc-postgres',
    }),

  POSTGRES_PORT: Joi.number()
    .port()
    .required()
    .messages({
      'any.required': 'POSTGRES_PORT es obligatorio. Ej: 5432',
      'number.port': 'POSTGRES_PORT debe ser un puerto válido (1-65535)',
    }),

  POSTGRES_USER: Joi.string()
    .min(1)
    .required()
    .messages({
      'any.required': 'POSTGRES_USER es obligatorio',
      'string.min': 'POSTGRES_USER no puede estar vacío',
    }),

  POSTGRES_PASSWORD: Joi.string()
    .min(1)
    .required()
    .messages({
      'any.required': 'POSTGRES_PASSWORD es obligatorio',
      'string.min': 'POSTGRES_PASSWORD no puede estar vacío',
    }),

  POSTGRES_DB: Joi.string()
    .min(1)
    .required()
    .messages({
      'any.required': 'POSTGRES_DB es obligatorio. Ej: sgc_db',
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // MINIO — Object Storage S3-compatible
  // ───────────────────────────────────────────────────────────────────────────
  MINIO_ENDPOINT: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'any.required': 'MINIO_ENDPOINT es obligatorio. Ej: http://localhost:9000',
      'string.uri': 'MINIO_ENDPOINT debe ser una URL válida (http/https)',
    }),

  MINIO_ROOT_USER: Joi.string()
    .min(3)
    .required()
    .messages({
      'any.required': 'MINIO_ROOT_USER es obligatorio',
      'string.min': 'MINIO_ROOT_USER debe tener al menos 3 caracteres',
    }),

  MINIO_ROOT_PASSWORD: Joi.string()
    .min(8)
    .required()
    .messages({
      'any.required': 'MINIO_ROOT_PASSWORD es obligatorio',
      'string.min': 'MINIO_ROOT_PASSWORD debe tener al menos 8 caracteres',
    }),

  MINIO_BUCKET_NAME: Joi.string()
    .min(3)
    .max(63)
    .pattern(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/)
    .required()
    .messages({
      'any.required': 'MINIO_BUCKET_NAME es obligatorio. Ej: sgc-documents',
      'string.pattern.base':
        'MINIO_BUCKET_NAME debe seguir las reglas de nombres de bucket S3 (minúsculas, sin espacios)',
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // KEYCLOAK — Autenticación y autorización
  // ───────────────────────────────────────────────────────────────────────────
  KEYCLOAK_ISSUER_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'any.required':
        'KEYCLOAK_ISSUER_URL es obligatorio. Ej: http://localhost:8080/realms/sgc-realm',
      'string.uri': 'KEYCLOAK_ISSUER_URL debe ser una URL válida',
    }),

  KEYCLOAK_CLIENT_ID: Joi.string()
    .min(1)
    .required()
    .messages({
      'any.required': 'KEYCLOAK_CLIENT_ID es obligatorio',
    }),

  KEYCLOAK_CLIENT_SECRET: Joi.string()
    .min(1)
    .required()
    .messages({
      'any.required': 'KEYCLOAK_CLIENT_SECRET es obligatorio',
    }),

  KEYCLOAK_REALM: Joi.string()
    .min(1)
    .required()
    .messages({
      'any.required': 'KEYCLOAK_REALM es obligatorio. Ej: sgc-realm',
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // MS-CORE — Transporte TCP (comunicación inter-microservicio)
  // ───────────────────────────────────────────────────────────────────────────
  MS_CORE_TCP_HOST: Joi.string()
    .hostname()
    .required()
    .messages({
      'any.required': 'MS_CORE_TCP_HOST es obligatorio. Ej: 0.0.0.0',
    }),

  MS_CORE_TCP_PORT: Joi.number()
    .port()
    .required()
    .messages({
      'any.required': 'MS_CORE_TCP_PORT es obligatorio. Ej: 3001',
      'number.port': 'MS_CORE_TCP_PORT debe ser un puerto válido (1-65535)',
    }),

  MS_CORE_HTTP_PORT: Joi.number()
    .port()
    .required()
    .messages({
      'any.required': 'MS_CORE_HTTP_PORT es obligatorio. Ej: 3010',
      'number.port': 'MS_CORE_HTTP_PORT debe ser un puerto válido (1-65535)',
    }),
});

/**
 * Opciones de validación para Joi.
 *
 * - `abortEarly: false` → Recopila TODOS los errores antes de fallar.
 *   Esto permite al desarrollador ver en un solo arranque todas las
 *   variables que faltan, en lugar de corregirlas una por una.
 *
 * - `allowUnknown: true` → Permite variables del sistema operativo
 *   (PATH, HOME, SHELL, etc.) que no están definidas en el esquema.
 *   Si fuera `false`, Docker y CI/CD fallarían por variables del OS.
 */
export const configValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
};
