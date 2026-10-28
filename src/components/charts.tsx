// Small dependency-free SVG charts (server-renderable).
import { formatRs } from "@/lib/format";

export function BarChart({ data, highlight, height = 180 }: { data: { label: string; value: number }[]; highlight?: number; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height }} role="img" aria-label={data.map((d) => `${d.label}: ${formatRs(d.value)}`).join(", ")}>
        {data.map((d, i) => (
          <div key={d.label + i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
            <span className="text-[10px] text-muted">{d.value > 0 ? (d.value >= 1000 ? `${Math.round(d.value / 100) / 10}k` : d.value) : ""}</span>
            <div className={`w-full max-w-10 rounded-t-lg ${i === highlight ? "bg-gold" : "bg-indigo-600"}`} style={{ height: `${Math.max(2, (d.value / max) * 85)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        {data.map((d, i) => (
          <span key={d.label + i} className="flex-1 text-center text-xs text-muted">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  series,
  labels,
  height = 200,
}: {
  series: { name: string; color: string; values: number[] }[];
  labels: string[];
  height?: number;
}) {
  const W = 600;
  const H = height;
  const pad = 24;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = Math.max(1, labels.length - 1);
  const pt = (v: number, i: number) => `${pad + (i / n) * (W - pad * 2)},${H - pad - (v / max) * (H - pad * 2)}`;
  const step = Math.ceil(labels.length / 8);
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={series.map((s) => `${s.name} total ${formatRs(s.values.reduce((a, b) => a + b, 0))}`).join("; ")}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} x2={W - pad} y1={H - pad - f * (H - pad * 2)} y2={H - pad - f * (H - pad * 2)} stroke="#eef0f4" />
        ))}
        {series.map((s) => (
          <polyline key={s.name} fill="none" stroke={s.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" points={s.values.map(pt).join(" ")} />
        ))}
        {labels.map((l, i) =>
          i % step === 0 ? (
            <text key={l + i} x={pad + (i / n) * (W - pad * 2)} y={H - 4} fontSize="11" textAnchor="middle" fill="#6b7280">
              {l}
            </text>
          ) : null,
        )}
      </svg>
      <div className="flex gap-4 mt-2">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export const CHART_COLORS = ["#4F46E5", "#10B981", "#F5B83D", "#F43F5E", "#7C3AED", "#0EA5E9"];

export function DonutChart({ data, center }: { data: { label: string; value: number }[]; center?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 160 160" className="size-40 shrink-0" role="img" aria-label={data.map((d) => `${d.label} ${d.value}`).join(", ")}>
        <circle cx="80" cy="80" r={R} fill="none" stroke="#eef0f4" strokeWidth="22" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * C;
            const el = (
              <circle
                key={d.label}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth="22"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 80 80)"
              />
            );
            offset += len;
            return el;
          })}
        {center && (
          <text x="80" y="85" textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827">
            {center}
          </text>
        )}
      </svg>
      <ul className="space-y-2 text-sm w-full">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-gray-700">
              <span className="size-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              {d.label}
            </span>
            <span className="font-medium text-ink">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
