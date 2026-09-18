import { useId, type CSSProperties } from "react";
import { weatherLook } from "../../lib/weatherCodes";

interface Props {
  code: number;
  isDay?: boolean;
  size?: number;
  className?: string;
  glow?: boolean;
}

export function WeatherIcon({
  code,
  isDay = true,
  size = 64,
  className,
  glow = false,
}: Props) {
  const look = weatherLook(code, isDay);
  const id = useId().replace(/:/g, "");
  const style: CSSProperties = { width: size, height: size, overflow: "visible" };
  const showGlow = glow && look.kind === "sun";
  return (
    <svg
      viewBox="0 0 64 64"
      style={style}
      className={`weather-icon ${showGlow ? "weather-icon-glow" : ""} ${className ?? ""}`}
      aria-hidden
    >
      <Defs id={id} />
      {showGlow && <GoldenGlow id={id} />}
      {look.kind === "sun" && <Sun id={id} />}
      {look.kind === "night" && <Moon id={id} />}
      {look.kind === "partly" && (
        <>
          <Sun id={id} compact />
          <Cloud id={id} />
        </>
      )}
      {look.kind === "cloud" && <Cloud id={id} />}
      {look.kind === "fog" && (
        <>
          <Cloud id={id} muted />
          <Fog />
        </>
      )}
      {look.kind === "drizzle" && (
        <>
          <Cloud id={id} lift />
          <Rain id={id} light />
        </>
      )}
      {look.kind === "rain" && (
        <>
          <Cloud id={id} lift />
          <Rain id={id} />
        </>
      )}
      {look.kind === "snow" && (
        <>
          <Cloud id={id} lift />
          <Snow />
        </>
      )}
      {look.kind === "storm" && (
        <>
          <Cloud id={id} storm lift />
          <Bolt id={id} />
        </>
      )}
    </svg>
  );
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-sun-body`} cx="0.34" cy="0.3" r="0.78">
        <stop offset="0%" stopColor="#FFF6C4" />
        <stop offset="42%" stopColor="#FFD24A" />
        <stop offset="78%" stopColor="#F0A013" />
        <stop offset="100%" stopColor="#C56A08" />
      </radialGradient>
      <radialGradient id={`${id}-sun-spec`} cx="0.32" cy="0.28" r="0.35">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-moon-body`} cx="0.35" cy="0.3" r="0.8">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="45%" stopColor="#D5DEF0" />
        <stop offset="100%" stopColor="#7F8EAB" />
      </radialGradient>
      <radialGradient id={`${id}-puff`} cx="0.32" cy="0.28" r="0.78">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="48%" stopColor="#E7F1FA" />
        <stop offset="100%" stopColor="#9AADC4" />
      </radialGradient>
      <radialGradient id={`${id}-puff-storm`} cx="0.32" cy="0.28" r="0.78">
        <stop offset="0%" stopColor="#D5DEEA" />
        <stop offset="50%" stopColor="#7E8FA8" />
        <stop offset="100%" stopColor="#3E4C62" />
      </radialGradient>
      <radialGradient id={`${id}-drop`} cx="0.35" cy="0.28" r="0.7">
        <stop offset="0%" stopColor="#E7F7FF" />
        <stop offset="45%" stopColor="#5EC4FF" />
        <stop offset="100%" stopColor="#1A7EC8" />
      </radialGradient>
      <radialGradient id={`${id}-flake`} cx="0.4" cy="0.35" r="0.7">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#B7C9DE" />
      </radialGradient>
      <linearGradient id={`${id}-bolt`} x1="0.2" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#FFF4B0" />
        <stop offset="55%" stopColor="#F6C445" />
        <stop offset="100%" stopColor="#E08912" />
      </linearGradient>
      <filter id={`${id}-pop`} x="-35%" y="-35%" width="170%" height="180%">
        <feDropShadow dx="0" dy="2.4" stdDeviation="1.6" floodColor="#102033" floodOpacity="0.38" />
      </filter>
      <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#FFE08A" stopOpacity="0.55" />
        <stop offset="45%" stopColor="#F6C445" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#F6C445" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function GoldenGlow({ id }: { id: string }) {
  return (
    <g className="wx-sun-halo" style={{ transformOrigin: "32px 32px" }}>
      <circle cx="32" cy="32" r="30" fill={`url(#${id}-halo)`} />
      <ellipse className="wx-sun-shimmer" cx="24" cy="22" rx="10" ry="6" fill="#fff" opacity="0.18" />
    </g>
  );
}

function Sun({ id, compact = false }: { id: string; compact?: boolean }) {
  const cx = compact ? 42 : 32;
  const cy = compact ? 20 : 32;
  const r = compact ? 11 : 14.5;
  return (
    <g filter={`url(#${id}-pop)`}>
      <g className={compact ? undefined : "wx-spin-slow"} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <path
            key={i}
            d={`M${cx} ${cy - r - (compact ? 7 : 10)} l${compact ? 1.4 : 1.7} ${compact ? 6 : 8} h-${compact ? 2.8 : 3.4} z`}
            fill="#FFD24A"
            opacity="0.95"
            transform={`rotate(${i * 30} ${cx} ${cy})`}
          />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-sun-body)`} />
      <ellipse
        cx={cx - r * 0.28}
        cy={cy - r * 0.32}
        rx={r * 0.42}
        ry={r * 0.28}
        fill={`url(#${id}-sun-spec)`}
      />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#C56A08" strokeOpacity="0.25" strokeWidth="1" />
    </g>
  );
}

function Moon({ id }: { id: string }) {
  return (
    <g className="wx-float" filter={`url(#${id}-pop)`}>
      <circle cx="32" cy="32" r="16.5" fill={`url(#${id}-moon-body)`} />
      <ellipse cx="24" cy="23" rx="7" ry="4.5" fill="#fff" opacity="0.45" />
      <circle cx="25" cy="38" r="3.6" fill="#9AABC4" opacity="0.45" />
      <circle cx="25" cy="38" r="1.5" fill="#7E90AA" opacity="0.35" />
      <circle cx="40" cy="30" r="2.4" fill="#9AABC4" opacity="0.4" />
      <circle cx="37" cy="43" r="2" fill="#9AABC4" opacity="0.32" />
      <circle cx="32" cy="32" r="16.5" fill="none" stroke="#6F7F99" strokeOpacity="0.25" />
    </g>
  );
}

function Cloud({
  id,
  storm = false,
  muted = false,
  lift = false,
}: {
  id: string;
  storm?: boolean;
  muted?: boolean;
  lift?: boolean;
}) {
  const fill = storm ? `url(#${id}-puff-storm)` : `url(#${id}-puff)`;
  return (
    <g
      className="wx-float"
      style={{ ["--wx-y" as string]: lift ? "-5px" : "0px" }}
      filter={`url(#${id}-pop)`}
      opacity={muted ? 0.88 : 1}
    >
      <ellipse cx="32" cy="48" rx="18" ry="3.4" fill="#102033" opacity="0.22" />
      <circle cx="22" cy="34" r="11.5" fill={fill} />
      <circle cx="33" cy="28" r="13.5" fill={fill} />
      <circle cx="44" cy="34" r="11" fill={fill} />
      <ellipse cx="33" cy="38.5" rx="21" ry="11.5" fill={fill} />
      <ellipse cx="24" cy="26" rx="7" ry="3.4" fill="#fff" opacity={storm ? 0.18 : 0.55} />
      <ellipse cx="36" cy="24" rx="6" ry="2.8" fill="#fff" opacity={storm ? 0.12 : 0.35} />
      <ellipse cx="33" cy="43" rx="16" ry="4" fill="#6A7E96" opacity={storm ? 0.28 : 0.16} />
    </g>
  );
}

function Rain({ id, light = false }: { id: string; light?: boolean }) {
  const drops = light
    ? [
        { x: 24, delay: "0s" },
        { x: 33, delay: "0.22s" },
        { x: 43, delay: "0.1s" },
      ]
    : [
        { x: 19, delay: "0s" },
        { x: 27, delay: "0.16s" },
        { x: 34, delay: "0.06s" },
        { x: 41, delay: "0.24s" },
        { x: 49, delay: "0.12s" },
      ];
  return (
    <g>
      {drops.map((d) => (
        <g key={d.x} className="wx-drop" style={{ animationDelay: d.delay }}>
          <path
            d={`M${d.x} 44 C${d.x - 3.2} 50 ${d.x - 3.2} 54 ${d.x} 56 C${d.x + 3.2} 54 ${d.x + 3.2} 50 ${d.x} 44Z`}
            fill={`url(#${id}-drop)`}
          />
          <ellipse cx={d.x - 0.8} cy="49.5" rx="1.1" ry="1.6" fill="#fff" opacity="0.55" />
        </g>
      ))}
    </g>
  );
}

function Snow() {
  const flakes = [
    { x: 22, y: 50, delay: "0s" },
    { x: 33, y: 54, delay: "0.18s" },
    { x: 44, y: 49, delay: "0.32s" },
  ];
  return (
    <g>
      {flakes.map((f) => (
        <g
          key={f.x}
          className="wx-flake"
          style={{ animationDelay: f.delay, transformOrigin: `${f.x}px ${f.y}px` }}
        >
          <circle cx={f.x} cy={f.y} r="3.1" fill="#F7FBFF" stroke="#C5D4E6" strokeWidth="0.6" />
          <path
            d={`M${f.x} ${f.y - 3.4} V${f.y + 3.4} M${f.x - 3.4} ${f.y} H${f.x + 3.4} M${f.x - 2.4} ${f.y - 2.4} L${f.x + 2.4} ${f.y + 2.4} M${f.x + 2.4} ${f.y - 2.4} L${f.x - 2.4} ${f.y + 2.4}`}
            stroke="#9EB4CC"
            strokeWidth="0.7"
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  );
}

function Fog() {
  return (
    <g className="wx-fog" stroke="#D7E3F0" strokeWidth="3.4" strokeLinecap="round">
      <line x1="13" y1="47" x2="51" y2="47" />
      <line x1="17" y1="53" x2="47" y2="53" opacity="0.75" />
      <line x1="19" y1="41.5" x2="45" y2="41.5" opacity="0.5" />
    </g>
  );
}

function Bolt({ id }: { id: string }) {
  return (
    <g className="wx-bolt" filter={`url(#${id}-pop)`}>
      <polygon points="31,39 24,51.5 33,49.5 28,62 47,45.5 36,48 42,39" fill={`url(#${id}-bolt)`} />
      <polygon points="32,40.5 27.5,50.5 34.5,48.8 31.5,57 43,46.5 36,48.2 40.5,40.5" fill="#FFF6C4" opacity="0.7" />
    </g>
  );
}
