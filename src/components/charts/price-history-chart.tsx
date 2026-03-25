"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatShortDate } from "@/lib/format";

type PriceHistoryChartProps = {
  data: {
    time: string | Date;
    yesPriceCents: number;
    noPriceCents: number;
  }[];
};

export function PriceHistoryChart({ data }: PriceHistoryChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="yesArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#57d89b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#57d89b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(143,168,196,0.08)" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="rgba(152,168,186,0.7)"
            tickFormatter={(value) => formatShortDate(value)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="rgba(152,168,186,0.7)"
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
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
            formatter={(value) => [`${value ?? 0}%`, "Yes"]}
            labelFormatter={(value) => formatShortDate(value)}
          />
          <Area
            type="monotone"
            dataKey="yesPriceCents"
            stroke="#57d89b"
            fill="url(#yesArea)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
