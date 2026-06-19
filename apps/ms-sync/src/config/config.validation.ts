/**
 * @fileoverview Validación Fail-Fast de variables de entorno de ms-sync.
 *
 * Variables requeridas:
 *   - IMAP: host, port, user, password, TLS
 *   - ms-core TCP: host y port (para enviar eventos)
 *   - Polling: intervalo de sincronización
 *
 * CERO valores .default(). Todo es .required().
 *
 * @module config.validation
 */

import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // ── General ────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .required(),

  // ── IMAP por usuario (multi-tenant) ────────────────────────────────────────
  // Las credenciales IMAP ya NO vienen del env: cada usuario configura su
  // correo vía POST /user/imap-config y se guardan CIFRADAS en Postgres.
  // ms-sync las consulta a ms-core y las descifra con ENCRYPTION_KEY.
  ENCRYPTION_KEY: Joi.string()
    .length(64)
    .hex()
    .required()
    .messages({
      'any.required': 'ENCRYPTION_KEY es obligatorio (64 hex = 32 bytes).',
      'string.length': 'ENCRYPTION_KEY debe tener 64 caracteres hex.',
    }),

  // Credenciales IMAP de env (LEGADO / opcional; el flujo real es multiusuario).
  IMAP_HOST: Joi.string().optional(),
  IMAP_PORT: Joi.number().port().optional(),
  IMAP_USER: Joi.string().optional(),
  IMAP_PASSWORD: Joi.string().optional(),
  IMAP_TLS: Joi.boolean().optional(),

  // ── ms-core TCP (eventos + consulta de configs IMAP) ───────────────────────
  MS_CORE_TCP_HOST: Joi.string().hostname().required(),
  MS_CORE_TCP_PORT: Joi.number().port().required(),

  // ── Polling (Intervalo de sincronización) ──────────────────────────────────
  SYNC_INTERVAL_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(60)
    .required()
    .messages({
      'any.required': 'SYNC_INTERVAL_MINUTES es obligatorio. Ej: 5',
    }),
});

export const configValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
};
