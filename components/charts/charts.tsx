"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactNumber } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";

const TOKENS = ["chart-1", "chart-2", "muted", "line"] as const;

type Series = { key: string; label: string; color?: "primary" | "secondary"; format?: (n: number) => string };

function TooltipBox({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: { dataKey?: unknown; value?: unknown }[];
  label?: unknown;
  series: Series[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-muted">{String(label)}</p>
      {payload.map((p) => {
        const s = series.find((x) => x.key === p.dataKey);
        const v = Number(p.value ?? 0);
        return (
          <p key={String(p.dataKey)} className="text-ink tabular">
            {s?.label}: {s?.format ? s.format(v) : v.toLocaleString("en-US")}
          </p>
        );
      })}
    </div>
  );
}

/** Charts carry a text summary for screen readers; the SVG itself is hidden. */
export function TrendChart({
  data,
  x,
  series,
  summary,
  height = 220,
  kind = "line",
}: {
  data: Record<string, string | number>[];
  x: string;
  series: Series[];
  summary: string;
  height?: number;
  kind?: "line" | "bar";
}) {
  const c = useThemeColors(TOKENS);
  const AXIS = { stroke: c.muted, fontSize: 12, tickLine: false, axisLine: false } as const;
  const GRID = c.line;
  const color = (s: Series) => (s.color === "secondary" ? c["chart-2"] : c["chart-1"]);
  return (
    <figure className="flex flex-col gap-2">
      <div aria-hidden="true" style={{ height }} className="-ml-2">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={x} {...AXIS} minTickGap={24} />
              <YAxis {...AXIS} width={44} tickFormatter={(v: number) => compactNumber(v)} />
              <Tooltip cursor={{ stroke: GRID }} content={(p) => <TooltipBox {...(p as object)} series={series} />} />
              {series.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  type="monotone"
                  stroke={color(s)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={x} {...AXIS} minTickGap={12} />
              <YAxis {...AXIS} width={44} tickFormatter={(v: number) => compactNumber(v)} />
              <Tooltip cursor={{ fill: c.line }} content={(p) => <TooltipBox {...(p as object)} series={series} />} />
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} fill={color(s)} radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/** Horizontal share bars. Plain HTML, so it is accessible without a table. */
export function ShareBars({ items, format }: { items: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 text-sm">
            <span>{i.label}</span>
            <span className="text-muted tabular">{format(i.value)}</span>
          </div>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-tint/[0.07]">
            <div
              className="h-full origin-left rounded-full bg-accent transition-transform duration-700 ease-out"
              style={{ transform: `scaleX(${i.value / max})` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
