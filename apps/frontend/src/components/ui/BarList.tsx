/**
 * @fileoverview Lista de barras horizontales (CSS puro, sin dependencias) para
 * visualizar KPIs (por mes, por estado) en el estilo Neo-Brutalist.
 * @module ui/BarList
 */

export interface BarItem {
  readonly label: string;
  /** Valor que determina el ancho de la barra. */
  readonly value: number;
  /** Texto mostrado a la derecha (p. ej. monto formateado). */
  readonly display: string;
  /** Clase de color de la barra (default: bg-primary). */
  readonly barClass?: string;
}

interface BarListProps {
  readonly title: string;
  readonly items: ReadonlyArray<BarItem>;
  readonly emptyText: string;
}

export function BarList({ title, items, emptyText }: BarListProps) {
  const max = items.reduce((m, i) => Math.max(m, i.value), 0);

  return (
    <div className="brutal-card-sm bg-white p-6">
      <h3 className="mb-4 text-lg font-bold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-dark/60">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const pct = max > 0 ? Math.max(6, (item.value / max) * 100) : 0;
            return (
              <div key={item.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{item.label}</span>
                  <span className="font-mono text-dark/70">{item.display}</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-md border-2 border-black bg-secondary">
                  <div
                    className={`h-full ${item.barClass ?? 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
