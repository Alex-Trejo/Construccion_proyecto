/**
 * @fileoverview Guard JWT — Protege rutas exigiendo un Bearer token válido.
 *
 * Usa la estrategia 'jwt' (KeycloakJwtStrategy). Si el token falta o es
 * inválido, responde 401 Unauthorized automáticamente.
 *
 * @module JwtAuthGuard
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
