/**
 * @fileoverview DTOs para la configuración IMAP por usuario.
 * @module imap-config.dto
 */

/** Datos que envía el usuario para conectar su correo receptor. */
export interface ICreateImapConfigDto {
  readonly host: string;
  readonly port: number;
  readonly email: string;
  /** App Password — se cifra antes de persistir; NUNCA se guarda en claro. */
  readonly password: string;
  readonly tls?: boolean;
}

/** Representación segura (sin password) para respuestas. */
export interface IImapConfigDto {
  readonly id: string;
  readonly host: string;
  readonly port: number;
  readonly email: string;
  readonly tls: boolean;
  readonly isActive: boolean;
}

/** Resultado de una prueba de conexión IMAP. */
export interface IImapTestResultDto {
  readonly ok: boolean;
  /** Mensaje legible para el usuario (éxito o motivo del fallo). */
  readonly message: string;
}

/** Resultado de un escaneo IMAP disparado manualmente. */
export interface ISyncTriggerResult {
  /** Cuentas activas escaneadas. */
  readonly accounts: number;
  /** Adjuntos encontrados en total. */
  readonly attachments: number;
  /** Eventos (adjuntos) emitidos a ms-core para procesar. */
  readonly eventsEmitted: number;
}

/** Config activa con credencial CIFRADA (la consume ms-sync y descifra). */
export interface IImapActiveConfig {
  readonly ownerId: string;
  readonly host: string;
  readonly port: number;
  readonly email: string;
  readonly tls: boolean;
  readonly passwordEncrypted: string;
}
