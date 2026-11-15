// Playback is a pure reducer over a moment index. Every moment is derived from the trace,
// so stepping back reproduces state exactly: nothing is undone, it's simply re-derived.

import type { Moment } from "./moments";

export interface PlaybackState {
  index: number;
  playing: boolean;
  /** Moments per second while playing. */
  speed: number;
}

export type PlaybackAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "restart" }
  | { type: "end" }
  | { type: "goto"; index: number }
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "speed"; speed: number }
  /** Sent by a timer while playing. */
  | { type: "tick" }
  /** Run until back at this call depth or shallower: skip over a call's insides. */
  | { type: "stepOver" }
  /** Run until the current call returns to its caller. */
  | { type: "stepOut" };

export const SPEEDS = [0.5, 1, 2, 4] as const;

export function initialPlayback(): PlaybackState {
  return { index: 0, playing: false, speed: 1 };
}

export function playback(state: PlaybackState, action: PlaybackAction, moments: Pick<Moment, "depth">[]): PlaybackState {
  const last = Math.max(0, moments.length - 1);
  const clamp = (i: number) => Math.max(0, Math.min(last, i));
  switch (action.type) {
    case "next": return { ...state, index: clamp(state.index + 1), playing: false };
    case "prev": return { ...state, index: clamp(state.index - 1), playing: false };
    case "restart": return { ...state, index: 0, playing: false };
    case "end": return { ...state, index: last, playing: false };
    case "goto": return { ...state, index: clamp(action.index), playing: false };
    case "play": return { ...state, playing: true, index: state.index >= last ? 0 : state.index };
    case "pause": return { ...state, playing: false };
    case "toggle": return playback(state, { type: state.playing ? "pause" : "play" }, moments);
    case "speed": return { ...state, speed: action.speed };
    case "tick": {
      if (!state.playing) return state;
      const index = clamp(state.index + 1);
      return { ...state, index, playing: index < last };
    }
    case "stepOver":
    case "stepOut": {
      const depth = moments[state.index]?.depth ?? 1;
      const target = action.type === "stepOver" ? depth : depth - 1;
      for (let i = state.index + 1; i <= last; i++) {
        if (moments[i].depth <= target) return { ...state, index: i, playing: false };
      }
      return { ...state, index: last, playing: false };
    }
  }
}
