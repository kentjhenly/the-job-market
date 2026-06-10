interface DeltaProps {
  value: number;
  suffix?: string;
}

export function Delta({ value, suffix = "" }: DeltaProps) {
  const up = value >= 0;
  return (
    <span className="mono tnum" style={{ color: up ? "var(--up)" : "var(--down)", fontSize: 12, fontWeight: 600 }}>
      {up ? "▲" : "▼"} {up ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}
