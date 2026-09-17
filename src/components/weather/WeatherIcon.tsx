import { useId, type CSSProperties } from "react";
import { weatherLook } from "../../lib/weatherCodes";

interface Props {
  code: number;
  isDay?: boolean;
  size?: number;
  className?: string;
}

export function WeatherIcon({ code, isDay = true, size = 64, className }: Props) {
  const look = weatherLook(code, isDay);
  const rawId = useId().replace(/:/g, "");
  const style: CSSProperties = { width: size, height: size };
  return (
    <svg
      viewBox="0 0 64 64"
      style={style}
      className={`weather-icon ${className ?? ""}`}
      aria-hidden
    >
      <Defs id={rawId} />
      {look.kind === "sun" && <Sun id={rawId} />}
      {look.kind === "night" && <Moon id={rawId} />}
      {look.kind === "partly" && (
        <>
          <Sun id={rawId} compact />
          <Cloud id={rawId} />
        </>
      )}
      {look.kind === "cloud" && <Cloud id={rawId} />}
      {look.kind === "fog" && (
        <>
          <Cloud id={rawId} muted />
          <Fog />
        </>
      )}
      {look.kind === "drizzle" && (
        <>
          <Cloud id={rawId} rainShift />
          <Rain light />
        </>
      )}
      {look.kind === "rain" && (
        <>
          <Cloud id={rawId} rainShift />
          <Rain />
        </>
      )}
      {look.kind === "snow" && (
        <>
          <Cloud id={rawId} rainShift />
          <Snow />
        </>
      )}
      {look.kind === "storm" && (
        <>
          <Cloud id={rawId} storm rainShift />
          <Bolt />
        </>
      )}
    </svg>
  );
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-sun`} x1="0.2" y1="0.1" x2="0.85" y2="1">
        <stop offset="0%" stopColor="#FFE9A0" />
        <stop offset="45%" stopColor="#F6C445" />
        <stop offset="100%" stopColor="#E08912" />
      </linearGradient>
      <radialGradient id={`${id}-sun-hl`} cx="0.35" cy="0.3" r="0.55">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-moon`} x1="0.2" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#F4F7FF" />
        <stop offset="55%" stopColor="#C9D4EA" />
        <stop offset="100%" stopColor="#8A9BB8" />
      </linearGradient>
      <linearGradient id={`${id}-cloud`} x1="0.3" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="38%" stopColor="#E7F0FA" />
        <stop offset="100%" stopColor="#9AAFC8" />
      </linearGradient>
      <linearGradient id={`${id}-cloud-storm`} x1="0.3" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#C5D0E0" />
        <stop offset="40%" stopColor="#7E8FA8" />
        <stop offset="100%" stopColor="#4A5A72" />
      </linearGradient>
      <linearGradient id={`${id}-cloud-edge`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6F849C" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#2C3A4C" stopOpacity="0.55" />
      </linearGradient>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.2" stdDeviation="1.4" floodColor="#071018" floodOpacity="0.4" />
      </filter>
    </defs>
  );
}

function Sun({ id, compact = false }: { id: string; compact?: boolean }) {
  const cx = compact ? 40 : 32;
  const cy = compact ? 22 : 32;
  const r = compact ? 10 : 13;
  return (
    <g className={compact ? undefined : "wx-spin-slow"} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x={cx - 1.6}
          y={cy - r - (compact ? 8 : 12)}
          width={compact ? 3.2 : 3.4}
          height={compact ? 6 : 8}
          rx="1.6"
          fill="#F6C445"
          transform={`rotate(${i * 45} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-sun)`} filter={`url(#${id}-soft)`} />
      <ellipse
        cx={cx - r * 0.28}
        cy={cy - r * 0.28}
        rx={r * 0.42}
        ry={r * 0.28}
        fill={`url(#${id}-sun-hl)`}
      />
    </g>
  );
}

function Moon({ id }: { id: string }) {
  return (
    <g className="wx-float" filter={`url(#${id}-soft)`}>
      <circle cx="32" cy="32" r="16" fill={`url(#${id}-moon)`} />
      <ellipse cx="24" cy="24" rx="6" ry="4" fill="#fff" opacity="0.35" />
      <circle cx="26" cy="38" r="3.2" fill="#A9B7CC" opacity="0.55" />
      <circle cx="38" cy="30" r="2.2" fill="#A9B7CC" opacity="0.4" />
      <circle cx="36" cy="42" r="1.6" fill="#A9B7CC" opacity="0.35" />
    </g>
  );
}

function Cloud({
  id,
  storm = false,
  muted = false,
  rainShift = false,
}: {
  id: string;
  storm?: boolean;
  muted?: boolean;
  rainShift?: boolean;
}) {
  const fill = storm ? `url(#${id}-cloud-storm)` : `url(#${id}-cloud)`;
  return (
    <g
      className="wx-float"
      style={{ ["--wx-y" as string]: rainShift ? "-4px" : "0px" }}
      filter={`url(#${id}-soft)`}
    >
      <ellipse cx="32" cy="46" rx="20" ry="3.6" fill="#071018" opacity="0.28" />
      <path
        d="M18.5 42.5h27c5.6 0 9.2-4.4 7.4-9.2 3.2-1.6 3.4-7.4-1.2-9.2C50.4 16.8 40 14 33.5 20.2 27.2 13.6 16.8 16.6 16 24.8 9.2 26.4 8.2 38.6 18.5 42.5Z"
        fill={fill}
        opacity={muted ? 0.85 : 1}
      />
      <path
        d="M18.5 42.5h27c5.6 0 9.2-4.4 7.4-9.2 3.2-1.6 3.4-7.4-1.2-9.2C50.4 16.8 40 14 33.5 20.2 27.2 13.6 16.8 16.6 16 24.8 9.2 26.4 8.2 38.6 18.5 42.5Z"
        fill="none"
        stroke={`url(#${id}-cloud-edge)`}
        strokeWidth="1.4"
      />
      <path
        d="M22 28c3-6 12-8 18-3 1.4-.4 3 0 4 1.2C40 22 32 21 26 26c-1.4 0.8-2.8 1.6-4 2Z"
        fill="#fff"
        opacity={storm ? 0.18 : 0.55}
      />
    </g>
  );
}

function Rain({ light = false }: { light?: boolean }) {
  const drops = light
    ? [
        { x: 24, delay: "0s" },
        { x: 33, delay: "0.25s" },
        { x: 42, delay: "0.12s" },
      ]
    : [
        { x: 20, delay: "0s" },
        { x: 27, delay: "0.18s" },
        { x: 34, delay: "0.08s" },
        { x: 41, delay: "0.28s" },
        { x: 48, delay: "0.14s" },
      ];
  return (
    <g>
      {drops.map((d) => (
        <path
          key={d.x}
          className="wx-drop"
          style={{ animationDelay: d.delay }}
          d={`M${d.x} 46 q-1.4 4 0 9 q1.4-2.2 0-4`}
          fill="#5EC4FF"
          stroke="#9BDEFF"
          strokeWidth="0.6"
        />
      ))}
    </g>
  );
}

function Snow() {
  const flakes = [
    { x: 22, y: 48, r: 2.1, delay: "0s" },
    { x: 32, y: 52, r: 2.4, delay: "0.2s" },
    { x: 42, y: 47, r: 2, delay: "0.35s" },
  ];
  return (
    <g fill="#F4F7FB" stroke="#C9D8EA" strokeWidth="0.6">
      {flakes.map((f) => (
        <g
          key={f.x}
          className="wx-flake"
          style={{ animationDelay: f.delay, transformOrigin: `${f.x}px ${f.y}px` }}
        >
          <circle cx={f.x} cy={f.y} r={f.r} />
          <path d={`M${f.x} ${f.y - 3.4} V${f.y + 3.4} M${f.x - 3.4} ${f.y} H${f.x + 3.4}`} />
        </g>
      ))}
    </g>
  );
}

function Fog() {
  return (
    <g className="wx-fog" stroke="#D5E0EE" strokeWidth="3.2" strokeLinecap="round">
      <line x1="14" y1="48" x2="50" y2="48" />
      <line x1="18" y1="54" x2="46" y2="54" opacity="0.7" />
      <line x1="20" y1="43" x2="44" y2="43" opacity="0.45" />
    </g>
  );
}

function Bolt() {
  return (
    <g className="wx-bolt" filter="drop-shadow(0 1px 1px rgba(0,0,0,0.45))">
      <polygon points="30,40 24,52 33,50 28,62 46,46 36,48 42,40" fill="#F8D15C" />
      <polygon points="31,41 27,51 34,49.5 31,57 42,47 35.5,48.5 40,41" fill="#FFF3B0" />
    </g>
  );
}
