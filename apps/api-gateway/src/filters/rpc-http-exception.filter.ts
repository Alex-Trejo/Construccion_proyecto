/**
 * @fileoverview Filtro global de excepciones del API Gateway.
 *
 * El gateway reenvía peticiones a los microservicios por TCP. Cuando un
 * microservicio lanza un error, éste llega como un objeto serializado
 * `{ statusCode, message }`. Sin traducción, Nest lo trata como error
 * desconocido y responde 500 "Internal server error", ocultando la causa.
 *
 * Este filtro:
 *   1. Respeta las HttpException nativas del gateway (guards, validación…).
 *   2. Traduce los errores de microservicio a su código y mensaje reales,
 *      para que el usuario final vea QUÉ salió mal.
 *   3. Cae a un 500 genérico solo cuando no hay información utilizable.
 *
 * @module RpcHttpExceptionFilter
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class RpcHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // 1. Excepciones HTTP nativas del gateway (401, 403, 400 de validación…).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(
          typeof body === 'string' ? { statusCode: status, message: body } : body,
        );
      return;
    }

    // 2. Errores propagados desde microservicios TCP ({ statusCode, message }).
    const rpc = this.extractRpcError(exception);
    if (rpc) {
      response
        .status(rpc.status)
        .json({ statusCode: rpc.status, message: rpc.message });
      return;
    }

    // 3. Cualquier otra cosa → 500 genérico (con log para diagnóstico).
    this.logger.error(`Excepción no controlada: ${this.describe(exception)}`);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }

  /**
   * Extrae `{ status, message }` de un error de microservicio si es posible.
   * Devuelve `null` cuando el error no trae un mensaje utilizable.
   */
  private extractRpcError(
    exception: unknown,
  ): { status: number; message: string } | null {
    if (typeof exception !== 'object' || exception === null) {
      return null;
    }
    const obj = exception as Record<string, unknown>;

    const rawMessage = obj.message;
    let message: string | null = null;
    if (typeof rawMessage === 'string') {
      message = rawMessage;
    } else if (Array.isArray(rawMessage)) {
      message = rawMessage.join(', ');
    }
    if (message === null) {
      return null;
    }

    const rawStatus = obj.statusCode ?? obj.status;
    const status =
      typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 599
        ? rawStatus
        : HttpStatus.INTERNAL_SERVER_ERROR;

    return { status, message };
  }

  private describe(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    try {
      return JSON.stringify(exception);
    } catch {
      return String(exception);
    }
  }
}
