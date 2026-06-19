/**
 * @fileoverview DTOs para gestión de usuarios y roles (IAM).
 *
 * Los roles son DINÁMICOS (no hay enum fijo): el catálogo vive en Keycloak
 * (realm roles) y se espeja en Postgres. Los nombres de rol son strings.
 *
 * @module user.dto
 */

/** Representación de un usuario (espejo del usuario de Keycloak). */
export interface IUserDto {
  /** ID del usuario en Keycloak (sub del JWT). */
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly enabled: boolean;
  /** Roles de realm asignados. */
  readonly roles: ReadonlyArray<string>;
}

/** DTO para crear un usuario (se crea en Keycloak; la contraseña NO se persiste en Postgres). */
export interface ICreateUserDto {
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
  /** Rol inicial a asignar (nombre del realm role). */
  readonly role: string;
}

/** DTO para fijar el conjunto de roles de un usuario (set absoluto). */
export interface IAssignRolesDto {
  readonly roles: ReadonlyArray<string>;
}

/** Representación de un rol (realm role de Keycloak, espejado en Postgres). */
export interface IRoleDto {
  readonly name: string;
  readonly description: string | null;
}

/** DTO para crear un rol de realm. */
export interface ICreateRoleDto {
  readonly name: string;
  readonly description?: string;
}
