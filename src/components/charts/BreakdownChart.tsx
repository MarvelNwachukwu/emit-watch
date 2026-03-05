"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { EventBreakdown } from "@/lib/analytics";

type Props = {
  data: EventBreakdown[];
};

export function BreakdownChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted">
        Event Distribution
      </h4>
      <div className="flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="eventName"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={60}
                strokeWidth={0}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.eventName} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "var(--foreground)",
                }}
                formatter={(value) => [`${value} events`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5 overflow-hidden">
          {data.slice(0, 8).map((item) => (
            <div key={item.eventName} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-[11px] text-foreground/80">
                {item.eventName}
              </span>
              <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
