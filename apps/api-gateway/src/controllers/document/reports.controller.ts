/**
 * @fileoverview Controller HTTP — Reportes / KPIs del dashboard.
 *   GET /dashboard/metrics → KPIs financieros del usuario.
 * @module ReportsController
 */

import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { firstValueFrom, timeout } from 'rxjs';
import {
  DOCUMENT_PATTERNS,
  MICROSERVICE_TOKENS,
  type IDashboardFilters,
  type IDashboardMetrics,
  type TcpPayload,
} from '@sgc/shared';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { buildTcpMetadata } from '../../auth/tcp-metadata';
import type { AuthenticatedUser } from '../../auth/keycloak-jwt.strategy';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    @Inject(MICROSERVICE_TOKENS.MS_CORE_CLIENT)
    private readonly msCore: ClientProxy,
  ) {}

  @Get('metrics')
  async metrics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('documentType') documentType?: string,
  ): Promise<IDashboardMetrics> {
    const filters: IDashboardFilters = {
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
      ...(documentType ? { documentType } : {}),
    };
    const payload: TcpPayload<IDashboardFilters> = {
      data: filters,
      metadata: buildTcpMetadata(user),
    };
    return firstValueFrom(
      this.msCore
        .send<IDashboardMetrics>(DOCUMENT_PATTERNS.METRICS, payload)
        .pipe(timeout(10_000)),
    );
  }
}
