import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The film's clock: which scene is on screen, how far into it we are, and whether it's playing.
 * Time advances with requestAnimationFrame while playing; scenes advance on their own.
 */
export function useFilm(durations: number[], autoplay = true) {
  const [scene, setScene] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const last = useRef<number | null>(null);
  const ended = scene === durations.length - 1 && elapsed >= durations[scene];

  useEffect(() => {
    if (!playing) { last.current = null; return; }
    let raf = 0;
    const tick = (now: number) => {
      const dt = last.current === null ? 0 : now - last.current;
      last.current = now;
      setElapsed((e) => e + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Move to the next scene when this one's time is up; stop at the end.
  useEffect(() => {
    if (elapsed < durations[scene]) return;
    if (scene < durations.length - 1) { setScene(scene + 1); setElapsed(0); }
    else setPlaying(false);
  }, [elapsed, scene, durations]);

  const go = useCallback((i: number) => {
    setScene(Math.max(0, Math.min(durations.length - 1, i)));
    setElapsed(0);
  }, [durations.length]);

  const toggle = useCallback(() => {
    if (ended) { go(0); setPlaying(true); }
    else setPlaying((p) => !p);
  }, [ended, go]);

  return { scene, elapsed, playing, ended, go, toggle, setPlaying };
}
