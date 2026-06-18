/**
 * @fileoverview Logger de aplicación — Consola + envío a Loki (Grafana).
 *
 * Usa nest-winston con dos transports:
 *   - Console: salida legible en desarrollo.
 *   - Loki: empuja los logs a Loki (http://127.0.0.1:3100 por defecto) con la
 *     etiqueta `app=<nombre>` para filtrarlos en Grafana → Explore.
 *
 * El envío a Loki es best-effort: si Loki no está disponible no rompe la app.
 *
 * @module loki-logger
 */

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';

export function createAppLogger(appName: string) {
  // 127.0.0.1 (no "localhost") para evitar el flakeo IPv6 en Windows.
  const lokiHost = process.env.LOKI_URL ?? 'http://127.0.0.1:3100';

  return WinstonModule.createLogger({
    level: 'debug',
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.colorize(),
          winston.format.printf((info) => {
            const ctx = info['context'] ? ` [${String(info['context'])}]` : '';
            return `${String(info['timestamp'])} ${info.level}${ctx} ${info.message}`;
          }),
        ),
      }),
      new LokiTransport({
        host: lokiHost,
        labels: { app: appName },
        json: true,
        format: winston.format.json(),
        replaceTimestamp: true,
        batching: true,
        interval: 5,
        onConnectionError: (err: unknown) =>
          // eslint-disable-next-line no-console
          console.error(`[loki] error de conexión (${appName}):`, err),
      }),
    ],
  });
}
