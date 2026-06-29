import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { RevenueDatum } from "@/lib/canchas/stats-api";

interface RevenueChartProps {
  data: RevenueDatum[];
}

function formatPeriodLabel(period: string): string {
  // "2026-05" → parse as first of month, format as "May 26"
  const [year, month] = period.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString("en", { month: "short", year: "2-digit" });
}

function formatMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString("es-CO")}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const isEmpty =
    data.length === 0 ||
    data.every((d) => d.collected === 0 && d.scheduled === 0);

  if (isEmpty) {
    return (
      <p className="text-center text-muted-foreground text-sm py-8">
        Sin datos en este período
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="period"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={formatPeriodLabel}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          width={40}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
          formatter={(value: number, name: string) => [
            formatMoney(value),
            name,
          ]}
          labelFormatter={formatPeriodLabel}
          contentStyle={{
            borderRadius: "0.5rem",
            fontSize: "12px",
            border: "1px solid hsl(var(--border))",
          }}
        />
        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
        />
        <Bar
          dataKey="collected"
          name="Cobrado"
          fill="#7c3aed"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="scheduled"
          name="Programado"
          fill="#a78bfa"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
