"use client";

/**
 * Lightweight CSS-only bar chart for agent task history.
 * No chart library needed — pure divs + Tailwind.
 */
export function AgentTaskChart({
  data,
}: {
  data: Array<{ date: string; completed: number; failed: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-surface-400">
        Pas assez de donnees pour afficher le graphique.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.completed + d.failed), 1);

  return (
    <div className="space-y-2">
      {/* Chart */}
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => {
          const total = d.completed + d.failed;
          const height = (total / maxVal) * 100;
          const failedHeight = total > 0 ? (d.failed / total) * height : 0;
          const completedHeight = height - failedHeight;

          return (
            <div key={d.date} className="flex-1 flex flex-col items-stretch justify-end h-full group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-surface-800 dark:bg-surface-100 text-white dark:text-surface-900 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                  <div className="font-medium">{d.date}</div>
                  <div className="text-emerald-300 dark:text-emerald-600">{d.completed} OK</div>
                  {d.failed > 0 && <div className="text-red-300 dark:text-red-600">{d.failed} erreurs</div>}
                </div>
              </div>

              {/* Bars */}
              <div
                className="bg-red-400 dark:bg-red-500/60 rounded-t-sm transition-all duration-300"
                style={{ height: `${failedHeight}%`, minHeight: d.failed > 0 ? 2 : 0 }}
              />
              <div
                className="bg-emerald-400 dark:bg-emerald-500/60 rounded-t-sm transition-all duration-300"
                style={{ height: `${completedHeight}%`, minHeight: total > 0 ? 2 : 0 }}
              />
            </div>
          );
        })}
      </div>

      {/* X axis labels */}
      <div className="flex gap-1">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {(i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) && (
              <span className="text-[9px] text-surface-400 tabular-nums">
                {d.date.slice(5)} {/* MM-DD */}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-500/60" />
          <span className="text-[10px] text-surface-400">Completees</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-400 dark:bg-red-500/60" />
          <span className="text-[10px] text-surface-400">Echouees</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Mini sparkline-style stat with trend
 */
export function AgentStatTrend({
  label,
  value,
  previous,
  format,
}: {
  label: string;
  value: number;
  previous?: number;
  format?: (v: number) => string;
}) {
  const formatted = format ? format(value) : String(value);
  const diff = previous !== undefined ? value - previous : null;
  const pctChange = previous && previous > 0 ? Math.round(((value - previous) / previous) * 100) : null;

  return (
    <div>
      <div className="text-xs text-surface-400 mb-0.5">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-surface-900 dark:text-surface-50">{formatted}</span>
        {pctChange !== null && pctChange !== 0 && (
          <span className={`text-xs font-medium ${pctChange > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            {pctChange > 0 ? "+" : ""}{pctChange}%
          </span>
        )}
      </div>
    </div>
  );
}
