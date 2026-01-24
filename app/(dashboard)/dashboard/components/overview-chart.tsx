"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface OverviewChartProps {
  data: { name: string; total: number }[];
}

export function OverviewChart({ data }: OverviewChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
          itemStyle={{ color: "#0f172a", fontWeight: "bold" }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#0f172a"
          strokeWidth={2}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
