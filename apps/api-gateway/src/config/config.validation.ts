/**
 * @fileoverview Validación Fail-Fast de variables de entorno del API Gateway.
 *
 * Variables requeridas:
 *   - NODE_ENV, API_GATEWAY_PORT
 *   - Keycloak: issuer URL, realm, client ID/secret (para validar JWTs)
 *   - ms-core / ms-sync: host y port TCP (para ClientProxy)
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

  API_GATEWAY_PORT: Joi.number()
    .port()
    .required()
    .messages({ 'any.required': 'API_GATEWAY_PORT es obligatorio. Ej: 3000' }),

  // ── Keycloak (JWT Validation) ──────────────────────────────────────────────
  KEYCLOAK_ISSUER_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'any.required': 'KEYCLOAK_ISSUER_URL es obligatorio. Ej: http://localhost:8080/realms/sgc-realm',
    }),

  KEYCLOAK_REALM: Joi.string().min(1).required(),
  KEYCLOAK_CLIENT_ID: Joi.string().min(1).required(),
  KEYCLOAK_CLIENT_SECRET: Joi.string().min(1).required(),

  // ── ms-core TCP ────────────────────────────────────────────────────────────
  MS_CORE_TCP_HOST: Joi.string().hostname().required(),
  MS_CORE_TCP_PORT: Joi.number().port().required(),

  // ── ms-sync TCP ────────────────────────────────────────────────────────────
  MS_SYNC_TCP_HOST: Joi.string().hostname().required(),
  MS_SYNC_TCP_PORT: Joi.number().port().required(),
});

export const configValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
};
