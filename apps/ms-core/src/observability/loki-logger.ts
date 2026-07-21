/**
 * @fileoverview Logger de aplicación — Consola + envío a Loki (Grafana).
 *
 * Dos transports de winston:
 *   - Console: salida legible.
 *   - LokiHttpTransport (propio): empuja los logs a Loki vía HTTP (`fetch`
 *     nativo) al endpoint /loki/api/v1/push, con la etiqueta `app=<nombre>`.
 *
 * ¿Por qué propio y no `winston-loki`? Esa librería falla EN SILENCIO dentro
 * del contenedor (sus bindings nativos de snappy no cargan): no envía nada y
 * tampoco reporta error. El push HTTP directo (probado) es 100% fiable.
 *
 * Best-effort: si Loki no está disponible, no rompe la app.
 *
 * @module loki-logger
 */

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import TransportStream from 'winston-transport';

/** Símbolo interno de winston con el nivel SIN colorear. */
const LEVEL = Symbol.for('level');

interface LokiHttpOptions extends TransportStream.TransportStreamOptions {
  readonly host: string;
  readonly labels: Record<string, string>;
}

/**
 * Transport de Winston que envía logs a Loki por HTTP (push API v1).
 * Agrupa en micro-lotes de 1s (casi tiempo real) y garantiza timestamps
 * estrictamente crecientes por stream (Loki los exige).
 */
class LokiHttpTransport extends TransportStream {
  private readonly pushUrl: string;
  private readonly baseLabels: Record<string, string>;
  private buffer: Array<{ ts: string; level: string; line: string }> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastNs = 0n;

  constructor(opts: LokiHttpOptions) {
    super(opts);
    this.pushUrl = `${opts.host.replace(/\/+$/, '')}/loki/api/v1/push`;
    this.baseLabels = opts.labels;
  }

  /** Timestamp en nanosegundos, monótonamente creciente. */
  private nextTs(): string {
    let ns = BigInt(Date.now()) * 1_000_000n;
    if (ns <= this.lastNs) ns = this.lastNs + 1n;
    this.lastNs = ns;
    return ns.toString();
  }

  log(info: Record<string | symbol, unknown>, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));

    const level = String(info[LEVEL] ?? info['level'] ?? 'info');
    const ctx = info['context'] ? ` [${String(info['context'])}]` : '';
    const rawMsg = info['message'];
    const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
    this.buffer.push({ ts: this.nextTs(), level, line: `${level}${ctx} ${msg}` });

    if (!this.timer) {
      this.timer = setTimeout(() => void this.flush(), 1000);
      // No mantener vivo el event loop solo por este timer.
      this.timer.unref?.();
    }
    callback();
  }

  private async flush(): Promise<void> {
    this.timer = null;
    if (this.buffer.length === 0) return;
    const entries = this.buffer;
    this.buffer = [];

    // Un stream por nivel (label `level`), preservando el orden de llegada.
    const byLevel = new Map<string, Array<[string, string]>>();
    for (const e of entries) {
      const arr = byLevel.get(e.level) ?? [];
      arr.push([e.ts, e.line]);
      byLevel.set(e.level, arr);
    }
    const streams = [...byLevel.entries()].map(([level, values]) => ({
      stream: { ...this.baseLabels, level },
      values,
    }));

    try {
      await fetch(this.pushUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ streams }),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[loki] push falló:', err instanceof Error ? err.message : err);
    }
  }
}

export function createAppLogger(appName: string) {
  // 127.0.0.1 en local; en Docker se pasa LOKI_URL=http://loki:3100.
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
      new LokiHttpTransport({ host: lokiHost, labels: { app: appName } }),
    ],
  });
}
