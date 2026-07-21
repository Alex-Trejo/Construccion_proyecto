/**
 * @fileoverview Tarjeta de KPI (Neo-Brutalist) para el dashboard.
 * @module ui/StatCard
 */

interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly highlight?: boolean;
}

export function StatCard({ label, value, hint, highlight = false }: StatCardProps) {
  return (
    <div className={`brutal-card-sm p-6 ${highlight ? 'bg-primary' : 'bg-white'}`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-dark/60">
        {label}
      </p>
      <p className="mt-2 text-4xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-sm text-dark/60">{hint}</p>}
    </div>
  );
}
