/**
 * @fileoverview KeycloakAdminService — gestión de usuarios y roles vía la
 * Keycloak Admin REST API (fuente de verdad del IAM).
 *
 * Se autentica contra el realm `master` (admin-cli) con las credenciales de
 * administrador y opera sobre el realm de la aplicación. Las contraseñas se
 * crean en Keycloak; NUNCA se persisten en Postgres.
 *
 * @module keycloak-admin.service
 */

import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IUserDto,
  ICreateUserDto,
  IRoleDto,
  ICreateRoleDto,
} from '@sgc/shared';

interface KcRole {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

interface KcUser {
  readonly id: string;
  readonly username: string;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly enabled: boolean;
}

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private readonly baseUrl: string;
  private readonly realm: string;
  private readonly adminUser: string;
  private readonly adminPass: string;

  constructor(config: ConfigService) {
    const issuer = config.getOrThrow<string>('KEYCLOAK_ISSUER_URL');
    this.realm = config.getOrThrow<string>('KEYCLOAK_REALM');
    // issuer = http://host:8080/realms/<realm>  →  base = http://host:8080
    this.baseUrl = issuer.split('/realms/')[0];
    this.adminUser = config.getOrThrow<string>('KEYCLOAK_ADMIN_USER');
    this.adminPass = config.getOrThrow<string>('KEYCLOAK_ADMIN_PASSWORD');
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  private async getAdminToken(): Promise<string> {
    const res = await fetch(
      `${this.baseUrl}/realms/master/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: this.adminUser,
          password: this.adminPass,
        }),
      },
    );
    if (!res.ok) {
      throw new BadGatewayException(
        'No se pudo autenticar contra Keycloak Admin (revisa KEYCLOAK_ADMIN_USER/PASSWORD).',
      );
    }
    const json = (await res.json()) as { access_token: string };
    return json.access_token;
  }

  private async api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAdminToken();
    const res = await fetch(`${this.baseUrl}/admin/realms/${this.realm}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Keycloak Admin ${res.status} en ${path}: ${body}`);
      throw new BadGatewayException(`Keycloak Admin error ${res.status}: ${body}`);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  // ── Roles ──────────────────────────────────────────────────────────────────
  async listRoles(): Promise<IRoleDto[]> {
    const roles = await this.api<KcRole[]>('/roles');
    return roles
      .filter((r) => !r.name.startsWith('default-roles'))
      .map((r) => ({ name: r.name, description: r.description ?? null }));
  }

  async createRole(dto: ICreateRoleDto): Promise<IRoleDto> {
    await this.api('/roles', {
      method: 'POST',
      body: JSON.stringify({ name: dto.name, description: dto.description }),
    });
    return { name: dto.name, description: dto.description ?? null };
  }

  async deleteRole(name: string): Promise<void> {
    await this.api(`/roles/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  // ── Usuarios ────────────────────────────────────────────────────────────────
  async listUsers(): Promise<IUserDto[]> {
    const users = await this.api<KcUser[]>('/users?max=200');
    const result: IUserDto[] = [];
    for (const u of users) {
      result.push(this.toUserDto(u, await this.getUserRealmRoles(u.id)));
    }
    return result;
  }

  async createUser(dto: ICreateUserDto): Promise<IUserDto> {
    await this.api('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: dto.username,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        enabled: true,
        emailVerified: true,
        credentials: [
          { type: 'password', value: dto.password, temporary: false },
        ],
      }),
    });

    const found = await this.api<KcUser[]>(
      `/users?username=${encodeURIComponent(dto.username)}&exact=true`,
    );
    const user = found[0];
    if (!user) {
      throw new BadGatewayException('Usuario creado en Keycloak pero no recuperable.');
    }
    await this.setUserRoles(user.id, [dto.role]);
    return this.toUserDto(user, await this.getUserRealmRoles(user.id));
  }

  /** Fija el conjunto absoluto de roles de realm de un usuario. */
  async setUserRoles(userId: string, roles: ReadonlyArray<string>): Promise<IUserDto> {
    const allRoles = await this.api<KcRole[]>('/roles');
    const current = await this.api<KcRole[]>(
      `/users/${userId}/role-mappings/realm`,
    );

    const target = allRoles.filter((r) => roles.includes(r.name));
    const currentNames = new Set(current.map((c) => c.name));

    const toAdd = target
      .filter((t) => !currentNames.has(t.name))
      .map((t) => ({ id: t.id, name: t.name }));
    const toRemove = current
      .filter((c) => !roles.includes(c.name) && !c.name.startsWith('default-roles'))
      .map((c) => ({ id: c.id, name: c.name }));

    if (toAdd.length > 0) {
      await this.api(`/users/${userId}/role-mappings/realm`, {
        method: 'POST',
        body: JSON.stringify(toAdd),
      });
    }
    if (toRemove.length > 0) {
      await this.api(`/users/${userId}/role-mappings/realm`, {
        method: 'DELETE',
        body: JSON.stringify(toRemove),
      });
    }

    const user = await this.api<KcUser>(`/users/${userId}`);
    return this.toUserDto(user, await this.getUserRealmRoles(userId));
  }

  private async getUserRealmRoles(userId: string): Promise<string[]> {
    const roles = await this.api<KcRole[]>(
      `/users/${userId}/role-mappings/realm`,
    );
    return roles
      .map((r) => r.name)
      .filter((n) => !n.startsWith('default-roles'));
  }

  private toUserDto(u: KcUser, roles: string[]): IUserDto {
    return {
      id: u.id,
      username: u.username,
      email: u.email ?? '',
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      enabled: u.enabled,
      roles,
    };
  }
}
