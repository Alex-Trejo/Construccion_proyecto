/**
 * @fileoverview Controller HTTP — Gestión de Roles (IAM).
 *
 * Solo Administrador. CRUD de realm roles contra Keycloak (fuente de verdad)
 * con espejo en Postgres (eventos TCP a ms-core). Habilita gestión dinámica
 * de roles sin hardcode.
 *
 *   GET    /roles        → lista roles
 *   POST   /roles        → crea rol
 *   DELETE /roles/:name  → elimina rol
 *
 * @module role.controller
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IDENTITY_PATTERNS,
  MICROSERVICE_TOKENS,
  type ICreateRoleDto,
  type IRoleDto,
} from '@sgc/shared';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { KeycloakAdminService } from '../../keycloak/keycloak-admin.service';

@ApiTags('Roles (IAM)')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador')
export class RoleController {
  private readonly logger = new Logger(RoleController.name);

  constructor(
    private readonly kcAdmin: KeycloakAdminService,
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCore: ClientProxy,
  ) {}

  @Get()
  list(): Promise<IRoleDto[]> {
    return this.kcAdmin.listRoles();
  }

  @Post()
  async create(@Body() dto: ICreateRoleDto): Promise<IRoleDto> {
    const role = await this.kcAdmin.createRole(dto);
    this.mirrorUpsert(role);
    return role;
  }

  @Delete(':name')
  async remove(@Param('name') name: string): Promise<{ deleted: string }> {
    await this.kcAdmin.deleteRole(name);
    this.msCore
      .emit(IDENTITY_PATTERNS.DELETE_ROLE, { nombreRol: name })
      .subscribe({
        error: (e: unknown) =>
          this.logger.warn(`No se pudo espejar el borrado de rol: ${String(e)}`),
      });
    return { deleted: name };
  }

  private mirrorUpsert(role: IRoleDto): void {
    this.msCore
      .emit(IDENTITY_PATTERNS.UPSERT_ROLE, {
        nombreRol: role.name,
        descripcion: role.description,
      })
      .subscribe({
        error: (e: unknown) =>
          this.logger.warn(`No se pudo espejar el rol: ${String(e)}`),
      });
  }
}
