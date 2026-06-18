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

  // ── IMAP (Conexión al buzón de correo) ─────────────────────────────────────
  IMAP_HOST: Joi.string()
    .min(1)
    .required()
    .messages({ 'any.required': 'IMAP_HOST es obligatorio. Ej: imap.gmail.com' }),

  IMAP_PORT: Joi.number()
    .port()
    .required()
    .messages({ 'any.required': 'IMAP_PORT es obligatorio. Ej: 993' }),

  IMAP_USER: Joi.string()
    .email()
    .required()
    .messages({ 'any.required': 'IMAP_USER es obligatorio. Ej: bot@empresa.com' }),

  IMAP_PASSWORD: Joi.string()
    .min(1)
    .required()
    .messages({
      'any.required': 'IMAP_PASSWORD es obligatorio. Usa un App Password de Gmail, no la contraseña normal.',
    }),

  IMAP_TLS: Joi.boolean()
    .required()
    .messages({ 'any.required': 'IMAP_TLS es obligatorio. Ej: true' }),

  // ── ms-core TCP (Destino de eventos) ───────────────────────────────────────
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
