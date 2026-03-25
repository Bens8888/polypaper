"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatShortDate } from "@/lib/format";

type PerformanceChartProps = {
  data: {
    createdAt: string | Date;
    equityCents: number;
  }[];
};

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(143,168,196,0.08)" vertical={false} />
          <XAxis
            dataKey="createdAt"
            tickFormatter={(value) => formatShortDate(value)}
            stroke="rgba(152,168,186,0.7)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="rgba(152,168,186,0.7)"
            tickFormatter={(value) => formatCurrency(value)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 18,
              border: "1px solid rgba(143, 168, 196, 0.18)",
              background: "rgba(8, 18, 27, 0.96)",
              color: "#f8fafc",
            }}
            formatter={(value) => [formatCurrency(Number(value ?? 0)), "Equity"]}
            labelFormatter={(value) => formatShortDate(value)}
          />
          <Line
            type="monotone"
            dataKey="equityCents"
            stroke="#73a7ff"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
