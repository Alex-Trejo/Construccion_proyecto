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

/** Config activa con credencial CIFRADA (la consume ms-sync y descifra). */
export interface IImapActiveConfig {
  readonly ownerId: string;
  readonly host: string;
  readonly port: number;
  readonly email: string;
  readonly tls: boolean;
  readonly passwordEncrypted: string;
}
