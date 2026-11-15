import type { PlaybackAction, PlaybackState } from "../../engine/interpreter/playback";
import { SPEEDS } from "../../engine/interpreter/playback";

interface Props {
  state: PlaybackState;
  total: number;
  recursive: boolean;
  dispatch: (a: PlaybackAction) => void;
}

const Icon = ({ d, label }: { d: string; label: string }) => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><title>{label}</title><path d={d} /></svg>
);
const ICONS = {
  restart: "M4 4v5h5M4.6 13a6 6 0 1 0 1.2-6.3L4 9",
  prev: "M12.5 4.5 7 10l5.5 5.5",
  next: "M7.5 4.5 13 10l-5.5 5.5",
  play: "M6.5 4.2v11.6L15.5 10z",
  pause: "M6.5 4.5v11M13.5 4.5v11",
  over: "M3 12a7 7 0 0 1 13-3.5M16 4v4.5h-4.5M10 16h.01",
  out: "M10 15V5M5.5 9.5 10 5l4.5 4.5",
};

/** Playback controls. Every control also has a keyboard shortcut (listed in its label). */
export function Controls({ state, total, recursive, dispatch }: Props) {
  const atStart = state.index === 0;
  const atEnd = state.index >= total - 1;
  return (
    <div className="controls" role="toolbar" aria-label="Playback">
      <button type="button" className="ctl" onClick={() => dispatch({ type: "restart" })} disabled={atStart} aria-label="Restart (R)" title="Restart (R)"><Icon d={ICONS.restart} label="Restart" /></button>
      <button type="button" className="ctl" onClick={() => dispatch({ type: "prev" })} disabled={atStart} aria-label="Back one step (←)" title="Back one step (←)"><Icon d={ICONS.prev} label="Back" /></button>
      <button type="button" className="ctl play" onClick={() => dispatch({ type: "toggle" })} aria-label={state.playing ? "Pause (Space)" : "Play (Space)"} title={state.playing ? "Pause (Space)" : "Play (Space)"}>
        <Icon d={state.playing ? ICONS.pause : ICONS.play} label={state.playing ? "Pause" : "Play"} />
      </button>
      <button type="button" className="ctl" onClick={() => dispatch({ type: "next" })} disabled={atEnd} aria-label="Forward one step (→)" title="Forward one step (→)"><Icon d={ICONS.next} label="Forward" /></button>
      {recursive && (
        <>
          <button type="button" className="ctl text" onClick={() => dispatch({ type: "stepOver" })} disabled={atEnd} title="Skip over this call's inside steps (Shift →)">Step over</button>
          <button type="button" className="ctl text" onClick={() => dispatch({ type: "stepOut" })} disabled={atEnd} title="Run until this call returns (Shift ↑)">Step out</button>
        </>
      )}
      <input
        className="scrub"
        type="range"
        min={0}
        max={Math.max(0, total - 1)}
        value={state.index}
        onChange={(e) => dispatch({ type: "goto", index: Number(e.target.value) })}
        aria-label="Step"
        aria-valuetext={`Step ${state.index + 1} of ${total}`}
      />
      <span className="count" aria-live="off">{state.index + 1} / {total}</span>
      <label className="speed">
        <span className="sr-only">Speed</span>
        <select value={state.speed} onChange={(e) => dispatch({ type: "speed", speed: Number(e.target.value) })}>
          {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
        </select>
      </label>
    </div>
  );
}
