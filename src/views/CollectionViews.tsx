import type { ViewModel } from "../../engine/interpreter/viewmodel";

type MapProps = Extract<ViewModel, { kind: "map" }>;
type SetProps = Extract<ViewModel, { kind: "set" }>;
type StackProps = Extract<ViewModel, { kind: "stack" | "queue" }>;
type VarsProps = Extract<ViewModel, { kind: "vars" }>;

const STATE_TEXT = { added: "added", updated: "updated", same: "" } as const;

/** A dict as key → value rows. New rows slide in, updated values flash, looked-up keys are outlined. */
export function MapView({ label, present, entries, removed }: MapProps) {
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {!present ? <p className="view-empty">Not created yet</p> : entries.length === 0 && removed.length === 0 ? <p className="view-empty">Empty</p> : (
        <table className="map">
          <tbody>
            {entries.map((e) => (
              <tr key={e.key} className={`st-${e.state} ${e.focused ? "focused" : ""}`}>
                <td className="map-key">{e.key}</td>
                <td className="map-arrow" aria-hidden="true">→</td>
                <td className="map-value">{e.value}</td>
                <td className="sr-only">{STATE_TEXT[e.state]}{e.focused ? " (being looked up)" : ""}</td>
              </tr>
            ))}
            {removed.map((k) => (
              <tr key={`removed-${k}`} className="removed"><td className="map-key">{k}</td><td className="map-arrow" aria-hidden="true">→</td><td className="map-value">removed</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}

export function SetView({ label, present, items, removed }: SetProps) {
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {!present ? <p className="view-empty">Not created yet</p> : (
        <div className="chips-row">
          {items.length === 0 && removed.length === 0 && <p className="view-empty">Empty</p>}
          {items.map((i) => <span key={i.text} className={`token st-${i.state} ${i.focused ? "focused" : ""}`}>{i.text}</span>)}
          {removed.map((t) => <span key={`r-${t}`} className="token removed">{t}</span>)}
        </div>
      )}
    </figure>
  );
}

/** A stack grows upwards from the bottom; a queue runs left (front) to right (back). */
export function StackView({ kind, label, present, items, removed }: StackProps) {
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {!present ? <p className="view-empty">Not created yet</p> : (
        <div className={kind === "stack" ? "stack" : "queue"}>
          {kind === "stack" && removed.map((t, i) => <div key={`r-${i}`} className="slot removed" aria-label={`popped ${t}`}>{t}</div>)}
          {(kind === "stack" ? [...items].reverse() : items).map((it, i) => (
            <div key={`${i}-${it.text}`} className={`slot st-${it.state}`}>{it.text}</div>
          ))}
          {items.length === 0 && removed.length === 0 && <p className="view-empty">Empty</p>}
          {kind === "queue" && removed.map((t, i) => <div key={`r-${i}`} className="slot removed">{t}</div>)}
        </div>
      )}
      {kind === "stack" && items.length > 0 && <p className="view-note">top</p>}
    </figure>
  );
}

export function VarsView({ label, vars }: VarsProps) {
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      <dl className="vars">
        {vars.map((v) => (
          <div key={v.name} className={`var ${v.changed ? "changed" : ""} ${v.present ? "" : "absent"}`}>
            <dt>{v.name}</dt>
            <dd>{v.present ? v.text : "—"}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
