// A line chart of measured steps against input size, for each approach. The numbers are real:
// they come from running each approach at every size during the build.

interface Series { name: string; values: number[] }

const W = 560, H = 260, PAD = { l: 64, r: 120, t: 16, b: 44 };

function niceMax(v: number) {
  if (v <= 10) return Math.max(2, Math.ceil(v / 2) * 2);
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

/** `measure` names what's on the y axis, e.g. "Lines run" or "Peak extra memory". */
export function GrowthChart({ sizes, series, measure }: { sizes: number[]; series: Series[]; measure: string }) {
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  // n is drawn to scale (not evenly spaced), so a straight line really means linear growth
  // and a curve really means faster-than-linear growth.
  const maxN = Math.max(...sizes);
  const x = (i: number) => PAD.l + (sizes[i] / maxN) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);
  const ticks = [0, max / 2, max];

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${measure} as the input grows: ${series.map((s) => `${s.name} goes from ${s.values[0]} to ${s.values.at(-1)}`).join("; ")}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.l - 10} y={y(t) + 4} className="chart-tick" textAnchor="end">{t.toLocaleString()}</text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="chart-grid" />
        {/* Label only sizes far enough apart to read; every size is still in the table below. */}
        {sizes.map((n, i) => (i === 0 || x(i) - x(i - 1) > 28 ? <text key={n} x={x(i)} y={H - PAD.b + 20} className="chart-tick" textAnchor="middle">{n}</text> : null))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 6} className="chart-axis" textAnchor="middle">input size n</text>
        {series.map((s, k) => (
          <g key={s.name} className={`chart-series s${k}`}>
            <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3.5} />)}
            <text x={x(sizes.length - 1) + 10} y={y(s.values.at(-1)!) + 4} className="chart-label">{s.name}</text>
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">{measure}, measured at each input size</figcaption>
      <table className="chart-table">
        <thead><tr><th scope="col">n</th>{series.map((s) => <th key={s.name} scope="col">{s.name}</th>)}</tr></thead>
        <tbody>
          {sizes.map((n, i) => (
            <tr key={n}><th scope="row">{n}</th>{series.map((s) => <td key={s.name}>{s.values[i].toLocaleString()}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
