interface RadarDimension {
  axis: string;
  you: number;
  peer: number;
}

interface RadarChartProps {
  dims: RadarDimension[];
  size?: number;
}

export function RadarChart({ dims, size = 240 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34;
  const n = dims.length;
  const ang = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i: number, r: number): [number, number] => [
    cx + Math.cos(ang(i)) * R * (r / 100),
    cy + Math.sin(ang(i)) * R * (r / 100),
  ];
  const poly = (key: "you" | "peer") =>
    dims.map((d, i) => pt(i, d[key]).map((v) => v.toFixed(1)).join(",")).join(" ");
  const rings = [25, 50, 75, 100];

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", overflow: "visible" }}>
      {rings.map((r) => (
        <polygon
          key={r}
          points={dims.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(",")).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
          opacity={r === 100 ? 0.9 : 0.5}
        />
      ))}
      {dims.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" opacity="0.4" />;
      })}
      <polygon points={poly("peer")} fill="var(--muted)" fillOpacity="0.07" stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />
      <polygon points={poly("you")} fill="var(--up)" fillOpacity="0.14" stroke="var(--up)" strokeWidth="1.8" />
      {dims.map((d, i) => {
        const [x, y] = pt(i, d.you);
        return <circle key={i} cx={x} cy={y} r="2.6" fill="var(--up)" />;
      })}
      {dims.map((d, i) => {
        const [x, y] = pt(i, 116);
        return (
          <text
            key={i}
            x={x}
            y={y}
            fontSize="8.5"
            fontFamily="var(--font-mono)"
            letterSpacing="0.5"
            fill="var(--muted)"
            textAnchor={Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end"}
            dominantBaseline="middle"
          >
            {d.axis}
          </text>
        );
      })}
    </svg>
  );
}
