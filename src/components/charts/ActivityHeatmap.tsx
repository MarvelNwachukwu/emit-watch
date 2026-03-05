"use client";

import type { HeatmapCell } from "@/lib/analytics";

type Props = {
  data: HeatmapCell[];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({ data }: Props) {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map((c) => c.count), 1);

  // Build lookup grid
  const grid = new Map<string, number>();
  for (const cell of data) {
    grid.set(`${cell.day}-${cell.hour}`, cell.count);
  }

  function getOpacity(count: number): number {
    if (count === 0) return 0;
    return 0.15 + (count / maxCount) * 0.85;
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted">
        Activity Heatmap
      </h4>
      <div className="overflow-x-auto">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `40px repeat(24, minmax(14px, 1fr))`,
            gridTemplateRows: `20px repeat(7, 14px)`,
          }}
        >
          {/* Empty corner */}
          <div />
          {/* Hour labels */}
          {HOURS.map((h) => (
            <div
              key={`h-${h}`}
              className="flex items-center justify-center text-[8px] tabular-nums text-muted/60"
            >
              {h % 6 === 0 ? `${h}h` : ""}
            </div>
          ))}

          {/* Day rows */}
          {DAYS.map((day, dayIdx) => (
            <>
              <div
                key={`d-${day}`}
                className="flex items-center text-[9px] text-muted/70"
              >
                {day}
              </div>
              {HOURS.map((hour) => {
                const count = grid.get(`${dayIdx}-${hour}`) ?? 0;
                return (
                  <div
                    key={`${dayIdx}-${hour}`}
                    className="rounded-sm"
                    style={{
                      backgroundColor: `var(--accent)`,
                      opacity: getOpacity(count),
                    }}
                    title={`${day} ${hour}:00 — ${count} event${count !== 1 ? "s" : ""}`}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
