import type { CSSProperties } from "react";
import { weatherLook } from "../../lib/weatherCodes";

interface Props {
  code: number;
  isDay?: boolean;
  size?: number;
  className?: string;
}

export function WeatherIcon({ code, isDay = true, size = 64, className }: Props) {
  const look = weatherLook(code, isDay);
  const style: CSSProperties = { width: size, height: size };
  return (
    <svg
      viewBox="0 0 64 64"
      style={style}
      className={className}
      aria-hidden
    >
      {look.kind === "sun" && <Sun />}
      {look.kind === "night" && <Moon />}
      {look.kind === "partly" && (
        <>
          <Sun x={-6} y={-8} scale={0.72} />
          <Cloud />
        </>
      )}
      {look.kind === "cloud" && <Cloud solid />}
      {look.kind === "fog" && (
        <>
          <Cloud solid />
          <Fog />
        </>
      )}
      {look.kind === "drizzle" && (
        <>
          <Cloud solid />
          <Rain light />
        </>
      )}
      {look.kind === "rain" && (
        <>
          <Cloud solid />
          <Rain />
        </>
      )}
      {look.kind === "snow" && (
        <>
          <Cloud solid />
          <Snow />
        </>
      )}
      {look.kind === "storm" && (
        <>
          <Cloud solid dark />
          <Bolt />
        </>
      )}
    </svg>
  );
}

function Sun({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x="30"
          y="2"
          width="4"
          height="10"
          rx="2"
          fill="#F6C445"
          transform={`rotate(${i * 45} 32 32)`}
          opacity="0.95"
        />
      ))}
      <circle cx="32" cy="32" r="14" fill="#F8D15C" />
      <circle cx="28" cy="28" r="5" fill="#FFE58A" opacity="0.7" />
    </g>
  );
}

function Moon() {
  return (
    <g>
      <circle cx="34" cy="30" r="16" fill="#E8EEF8" />
      <circle cx="42" cy="26" r="14" fill="#0b1220" />
      <circle cx="28" cy="34" r="3" fill="#C9D4E5" opacity="0.5" />
    </g>
  );
}

function Cloud({ solid = false, dark = false }: { solid?: boolean; dark?: boolean }) {
  const fill = dark ? "#8FA0B8" : solid ? "#D7E3F2" : "#E8F0FA";
  return (
    <g>
      <ellipse cx="24" cy="34" rx="12" ry="10" fill={fill} />
      <ellipse cx="38" cy="32" rx="14" ry="12" fill={fill} />
      <ellipse cx="30" cy="38" rx="16" ry="10" fill={fill} />
    </g>
  );
}

function Rain({ light = false }: { light?: boolean }) {
  const drops = light ? [22, 32, 42] : [18, 26, 34, 42, 50];
  return (
    <g>
      {drops.map((x, i) => (
        <line
          key={x}
          x1={x}
          y1={46}
          x2={x - 2}
          y2={56 + (i % 2)}
          stroke="#7EC8FF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function Snow() {
  return (
    <g fill="#F4F7FB">
      <circle cx="22" cy="50" r="2.2" />
      <circle cx="32" cy="54" r="2.2" />
      <circle cx="42" cy="49" r="2.2" />
    </g>
  );
}

function Fog() {
  return (
    <g stroke="#C5D3E4" strokeWidth="3" strokeLinecap="round">
      <line x1="16" y1="50" x2="48" y2="50" />
      <line x1="20" y1="56" x2="44" y2="56" />
    </g>
  );
}

function Bolt() {
  return (
    <polygon
      points="30,42 26,54 34,52 30,62 44,48 36,50 40,42"
      fill="#F6C445"
    />
  );
}
