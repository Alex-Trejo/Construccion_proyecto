/**
 * @fileoverview Controller HTTP — Gestión de Usuarios (IAM).
 *
 * Solo Administrador. Opera sobre Keycloak (fuente de verdad) y espeja el
 * resultado en Postgres (vía evento TCP SYNC_USER a ms-core). La contraseña
 * se crea en Keycloak; NUNCA se persiste en Postgres.
 *
 *   GET  /users            → lista usuarios
 *   POST /users            → crea usuario + rol inicial
 *   PUT  /users/:id/roles  → fija el conjunto de roles
 *
 * @module user.controller
 */

import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IDENTITY_PATTERNS,
  MICROSERVICE_TOKENS,
  type IAssignRolesDto,
  type ICreateUserDto,
  type IUserDto,
} from '@sgc/shared';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { KeycloakAdminService } from '../keycloak/keycloak-admin.service';

@ApiTags('Users (IAM)')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly kcAdmin: KeycloakAdminService,
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCore: ClientProxy,
  ) {}

  @Get()
  list(): Promise<IUserDto[]> {
    return this.kcAdmin.listUsers();
  }

  @Post()
  async create(@Body() dto: ICreateUserDto): Promise<IUserDto> {
    const user = await this.kcAdmin.createUser(dto);
    this.mirror(user);
    return user;
  }

  @Put(':id/roles')
  async setRoles(
    @Param('id') id: string,
    @Body() dto: IAssignRolesDto,
  ): Promise<IUserDto> {
    const user = await this.kcAdmin.setUserRoles(id, dto.roles);
    this.mirror(user);
    return user;
  }

  /** Espeja el usuario en Postgres (best-effort, no bloquea la respuesta). */
  private mirror(user: IUserDto): void {
    this.msCore
      .emit(IDENTITY_PATTERNS.SYNC_USER, {
        keycloakId: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      })
      .subscribe({
        error: (e: unknown) =>
          this.logger.warn(`No se pudo espejar el usuario: ${String(e)}`),
      });
  }
}
