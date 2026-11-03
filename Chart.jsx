import { naira } from "../lib/format.js";

// Simple bar chart. data: [{ date, label, value }]
export default function Chart({ data }) {
  const W = 600, H = 230;
  const pad = { l: 6, r: 6, t: 22, b: 28 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W - pad.l - pad.r) / data.length;
  const step = Math.ceil(data.length / 7);
  const showValues = data.length <= 7;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Sales over the last ${data.length} days, total ${naira(total)}`}>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--ln)" strokeWidth="2" />
      {data.map((d, i) => {
        const h = ((H - pad.t - pad.b) * d.value) / max;
        const x = pad.l + i * bw;
        return (
          <g key={d.date}>
            <rect x={x + bw * 0.16} y={H - pad.b - h} width={bw * 0.68} height={d.value ? Math.max(h, 2) : 0} rx="4" fill="var(--gr)" />
            {showValues && d.value > 0 && (
              <text className="v" x={x + bw / 2} y={H - pad.b - h - 6} textAnchor="middle">
                {naira(d.value)}
              </text>
            )}
            {i % step === 0 && (
              <text x={x + bw / 2} y={H - 8} textAnchor="middle">{d.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
