import { useEffect, useReducer } from "react";
import type { Moment } from "../../engine/interpreter/moments";
import { initialPlayback, playback, type PlaybackAction, type PlaybackState } from "../../engine/interpreter/playback";

/** Playback over a list of moments, with a timer that ticks while playing. */
export function usePlayback(moments: Moment[], resetKey: string) {
  const [state, dispatch] = useReducer(
    (s: PlaybackState, a: PlaybackAction | { type: "reset" }) => (a.type === "reset" ? { ...initialPlayback(), speed: s.speed } : playback(s, a, moments)),
    undefined,
    initialPlayback,
  );

  // A different approach or problem starts from the beginning.
  useEffect(() => { dispatch({ type: "reset" }); }, [resetKey]);

  useEffect(() => {
    if (!state.playing) return;
    const t = setInterval(() => dispatch({ type: "tick" }), 1000 / state.speed);
    return () => clearInterval(t);
  }, [state.playing, state.speed]);

  return [state, dispatch] as const;
}
