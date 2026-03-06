"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TimeBucket } from "@/lib/analytics";

type Props = {
  data: TimeBucket[];
  eventTypes: string[];
  colorMap: Record<string, string>;
};

export function FrequencyChart({ data, eventTypes, colorMap }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted">
        Event Frequency
      </h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              {eventTypes.map((name) => (
                <linearGradient
                  key={name}
                  id={`grad-${name}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={colorMap[name] ?? "#6e6e78"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={colorMap[name] ?? "#6e6e78"}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 11,
                color: "var(--foreground)",
              }}
              itemStyle={{ color: "var(--foreground)", fontSize: 10 }}
              labelStyle={{ color: "var(--muted)", fontSize: 10, marginBottom: 4 }}
            />
            {eventTypes.map((name) => (
              <Area
                key={name}
                type="monotone"
                dataKey={`byEvent.${name}`}
                name={name}
                stackId="1"
                stroke={colorMap[name] ?? "#6e6e78"}
                fill={`url(#grad-${name})`}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
