import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { num } from "@/lib/utils";

export function AnimatedNumber({
  value, format = num, className,
}: { value: number; format?: (n: number) => string; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(Math.round(v * 10) / 10 === v ? v : Math.round(v)));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.8, ease: "easeOut" });
    return () => c.stop();
  }, [value, mv]);
  return (
    <motion.span className={className} data-testid="animated-number" data-value={value}>
      {text}
    </motion.span>
  );
}

export function Sparkline({
  data, color = "#22d3ee", height = 44, className,
}: { data: number[]; color?: string; height?: number; className?: string }) {
  const w = 200;
  const pts = data.length > 1 ? data : [0, 0];
  const max = Math.max(1, ...pts);
  const step = w / (pts.length - 1);
  const y = (v: number) => height - 4 - (v / max) * (height - 10);
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const id = `sp-${color.slice(1)}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className={className} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="trend">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface Slice { label: string; value: number; color: string }

export function Donut({ slices, size = 150, center }: { slices: Slice[]; size?: number; center?: React.ReactNode }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label="decision mix">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgb(255 255 255 / .06)" strokeWidth="14" />
        {total > 0 &&
          slices.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <motion.circle
                key={s.label}
                cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="14"
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
    </div>
  );
}

export function MeterBar({
  label, value, max, unit = "ms", color = "#22d3ee",
}: { label: string; value: number; max: number; unit?: string; color?: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-foreground">{value.toFixed(2)} {unit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
    </div>
  );
}
