import type { ViewModel } from "../../engine/interpreter/viewmodel";

type Props = Extract<ViewModel, { kind: "array" }>;

const CELL = 48;
const GAP = 6;
const STEP = CELL + GAP;

/** A list or string as a row of cells, with index pointers underneath and an optional range band. */
export function ArrayView({ label, present, cells, pointers, range }: Props) {
  // Several pointers on one cell stack downwards instead of overlapping.
  const rows = new Map<number, number>();
  const placed = pointers.map((p) => {
    const row = rows.get(p.index) ?? 0;
    rows.set(p.index, row + 1);
    return { ...p, row };
  });
  const pointerRows = Math.max(0, ...placed.map((p) => p.row + 1));
  const width = Math.max(cells.length * STEP - GAP, CELL);

  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {!present ? (
        <p className="view-empty">Not created yet</p>
      ) : cells.length === 0 ? (
        <p className="view-empty">Empty</p>
      ) : (
        <div className="array-scroll">
          {/* Room under the cells for every row of pointer labels (each label is a caret plus a name). */}
          <div className={`array ${range?.label ? "has-range-label" : ""}`} style={{ width, paddingBottom: pointerRows ? 18 + pointerRows * 24 : 4 }}>
            {range && range.to >= range.from && (
              <div
                className="array-range"
                style={{ transform: `translateX(${range.from * STEP - 4}px)`, width: (range.to - range.from + 1) * STEP - GAP + 8 }}
                aria-hidden="true"
              >
                {range.label && <span>{range.label}</span>}
              </div>
            )}
            {cells.map((c) => (
              <div key={c.index} className={`cell st-${c.state} ${c.focused ? "focused" : ""}`} style={{ left: c.index * STEP }}>
                <span className="cell-value">{c.text}</span>
                <span className="cell-index">{c.index}</span>
              </div>
            ))}
            {placed.map((p) => {
              const outside = p.index < 0 || p.index >= cells.length;
              return (
                <div
                  key={p.name}
                  className={`pointer ${p.moved ? "moved" : ""} ${outside ? "outside" : ""}`}
                  style={{ transform: `translate(${p.index * STEP + CELL / 2}px, ${CELL + 6 + p.row * 24}px)` }}
                >
                  <span>{p.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {range && <p className="sr-only">{range.label || "range"} from index {range.from} to {range.to}</p>}
      {pointers.length > 0 && <p className="sr-only">{pointers.map((p) => `${p.name} at index ${p.index}`).join(", ")}</p>}
    </figure>
  );
}
