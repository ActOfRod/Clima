export const RADAR_OPACITY = 0.88;

export interface PlaybackState {
  /** Fractional frame position in [0, count - 1]. */
  pos: number;
  /** Time spent resting on the last frame. */
  holdMs: number;
  /** Progress (0–1) of the short fade from the last frame back to the first, or null. */
  wrap: number | null;
}

export interface PlaybackTiming {
  frameMs: number;
  endHoldMs: number;
  wrapMs: number;
}

export const DEFAULT_TIMING: PlaybackTiming = { frameMs: 520, endHoldMs: 1400, wrapMs: 380 };

export function startPlayback(pos: number): PlaybackState {
  return { pos, holdMs: 0, wrap: null };
}

/**
 * Advance the loop by `dt` ms. The position only moves toward a frame whose
 * tiles are loaded, so playback waits instead of showing a blank frame. It rests
 * on the final (latest nowcast) frame, then fades quickly back to the start.
 */
export function advancePlayback(
  state: PlaybackState,
  dt: number,
  count: number,
  isReady: (index: number) => boolean,
  timing: PlaybackTiming = DEFAULT_TIMING,
): PlaybackState {
  if (count <= 1) return startPlayback(0);
  const last = count - 1;

  if (state.wrap != null) {
    const wrap = state.wrap + dt / timing.wrapMs;
    return wrap >= 1 ? startPlayback(0) : { ...state, wrap };
  }

  if (state.pos >= last) {
    const holdMs = state.holdMs + dt;
    if (holdMs < timing.endHoldMs) return { ...state, pos: last, holdMs };
    return isReady(0) ? { pos: last, holdMs, wrap: 0 } : { ...state, pos: last, holdMs };
  }

  const next = Math.floor(state.pos) + 1;
  if (!isReady(next)) return state;
  return { pos: Math.min(last, state.pos + dt / timing.frameMs), holdMs: 0, wrap: null };
}

export interface FrameMix {
  from: number;
  to: number;
  frac: number;
}

/** Which two frames are on screen and how far the dissolve between them has gone. */
export function frameMix(state: PlaybackState, count: number): FrameMix {
  if (count <= 1) return { from: 0, to: 0, frac: 0 };
  const last = count - 1;
  if (state.wrap != null) return { from: last, to: 0, frac: state.wrap };
  const from = Math.min(last, Math.max(0, Math.floor(state.pos)));
  const to = Math.min(last, from + 1);
  return { from, to, frac: to === from ? 0 : state.pos - from };
}

/**
 * Per-frame layer opacity. Layers are blended with `plus-lighter`, so opacities
 * of (1 - f) and f add up to a full-strength image with no mid-fade dimming.
 */
export function frameOpacity(index: number, mix: FrameMix): number {
  if (mix.from === mix.to) return index === mix.from ? 1 : 0;
  if (index === mix.from) return 1 - mix.frac;
  if (index === mix.to) return mix.frac;
  return 0;
}
