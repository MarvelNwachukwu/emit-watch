"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AddressActivity } from "@/lib/analytics";
import { truncateAddress } from "@/lib/utils";

type Props = {
  data: AddressActivity[];
};

export function TopAddressesChart({ data }: Props) {
  const top10 = data.slice(0, 10);
  if (top10.length === 0) return null;

  const chartData = top10.map((d) => ({
    address: truncateAddress(d.address),
    fullAddress: d.address,
    count: d.count,
    events: d.eventNames.join(", "),
  }));

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted">
        Top Addresses
      </h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fill: "var(--muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="address"
              tick={{ fill: "var(--muted)", fontSize: 9, fontFamily: "var(--font-geist-mono)" }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 11,
                color: "var(--foreground)",
              }}
              formatter={(value) => [`${value} appearances`]}
              labelFormatter={(_label, payload) => {
                const item = payload?.[0]?.payload as { fullAddress?: string } | undefined;
                return item?.fullAddress ?? String(_label);
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--accent)"
              radius={[0, 4, 4, 0]}
              barSize={14}
              fillOpacity={0.7}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
