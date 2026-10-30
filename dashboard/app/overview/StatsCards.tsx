interface Stats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  successRate: number;
}

export default function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Total Emails', value: stats.total ?? 0, color: 'text-brand-300' },
    { label: 'Sent', value: stats.sent ?? 0, color: 'text-success' },
    { label: 'Failed', value: stats.failed ?? 0, color: 'text-danger' },
    { label: 'Queued', value: stats.queued ?? 0, color: 'text-warning' },
    { label: 'Success rate', value: `${stats.successRate ?? 0}%`, color: 'text-success' },
  ];

  return (
    <div className="mb-10 grid grid-cols-2 gap-5 xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-canvas-border bg-canvas-raised p-6 shadow-glow"
        >
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {card.label}
          </h3>
          <div className={`text-4xl font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
