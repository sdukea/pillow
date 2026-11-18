import { useRef, useState } from "react";
import type { Arg } from "../../engine/tracer/types";
import { type InputField, LIMIT } from "../content/inputs";

// The input as objects you can touch. Every change goes straight back to the playground, which
// re-runs both approaches on it. Gestures all have keyboard equivalents.

interface Props { fields: InputField[]; args: Arg[]; onChange: (args: Arg[]) => void }

export function InputEditor({ fields, args, onChange }: Props) {
  const set = (i: number, arg: Arg) => onChange(args.map((a, k) => (k === i ? arg : a)));
  return (
    <div className="editor">
      {fields.map((f, i) => {
        const a = args[i];
        const value = a.kind === "value" ? a.value : a.values;
        return (
          <div key={f.name} className={`ed-field ed-${f.type}`}>
            <span className="ed-name">{f.name}</span>
            {f.type === "int" && <Scrubber value={value as number} onChange={(v) => set(i, { kind: "value", value: v })} label={f.name} />}
            {(f.type === "int-list" || f.type === "linked-list") && (
              <Cells
                items={value as number[]}
                kind="number"
                field={f}
                onChange={(items) => set(i, f.type === "linked-list" ? { kind: "linked_list", values: items } : { kind: "value", value: items })}
              />
            )}
            {f.type === "string" && (
              <Cells items={[...(value as string)]} kind="char" field={f} onChange={(items) => set(i, { kind: "value", value: items.join("") })} />
            )}
            {f.type === "tree" && <TreeEditor values={value as (number | null)[]} max={f.max ?? 15} onChange={(v) => set(i, { kind: "tree", values: v })} />}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ a number you drag
function Scrubber({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const start = useRef<{ x: number; v: number; moved: boolean } | null>(null);
  const [typing, setTyping] = useState(false);
  const clamp = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, v));
  if (typing) {
    return (
      <input
        className="scrub-input"
        autoFocus
        inputMode="numeric"
        defaultValue={value}
        aria-label={label}
        onBlur={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) onChange(clamp(n)); setTyping(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setTyping(false); }}
      />
    );
  }
  return (
    <button
      type="button"
      className="scrub"
      aria-label={`${label}: ${value}. Drag sideways or use the arrow keys to change.`}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); start.current = { x: e.clientX, v: value, moved: false }; }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 4) s.moved = true;
        if (s.moved) onChange(clamp(s.v + Math.round(dx / 10)));
      }}
      onPointerUp={() => { if (start.current && !start.current.moved) setTyping(true); start.current = null; }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); onChange(clamp(value + 1)); }
        if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); onChange(clamp(value - 1)); }
      }}
    >
      <span aria-hidden="true" className="scrub-arrow">‹</span>{value}<span aria-hidden="true" className="scrub-arrow">›</span>
    </button>
  );
}

// ------------------------------------------------------------------ cells you drag
const STEP = 56; // cell width + gap
const BRACKETS = ["(", ")", "[", "]", "{", "}"];
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

type Drag = { index: number; x0: number; y0: number; v0: number | string; mode: "?" | "value" | "move"; dx: number; overBin: boolean };

function Cells({ items, kind, field, onChange }: { items: (number | string)[]; kind: "number" | "char"; field: InputField; onChange: (items: (number | string)[]) => void }) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const bin = useRef<HTMLDivElement>(null);
  const sorted = field.rule === "sorted-unique";
  const alphabet = field.rule === "brackets-only" ? BRACKETS : LETTERS;
  const max = field.max ?? 16, min = field.min ?? 0;

  /** Keep rules true as you play: a sorted list stays sorted, with no repeats. */
  const normalize = (xs: (number | string)[]) => {
    if (!sorted) return xs;
    const ns = (xs as number[]).slice().sort((a, b) => a - b);
    for (let i = 1; i < ns.length; i++) if (ns[i] <= ns[i - 1]) ns[i] = ns[i - 1] + 1;
    return ns;
  };
  const shift = (v: number | string, by: number): number | string =>
    typeof v === "number" ? Math.max(-LIMIT, Math.min(LIMIT, v + by)) : alphabet[(alphabet.indexOf(v) + by + alphabet.length * 8) % alphabet.length] ?? alphabet[0];
  const commit = (xs: (number | string)[]) => onChange(normalize(xs));
  const remove = (i: number) => { if (items.length > min) commit(items.filter((_, k) => k !== i)); };
  const move = (from: number, to: number) => {
    const xs = items.slice();
    const [x] = xs.splice(from, 1);
    xs.splice(Math.max(0, Math.min(xs.length, to)), 0, x);
    commit(xs);
  };
  const add = () => {
    if (items.length >= max) return;
    const last = items.at(-1);
    commit([...items, kind === "number" ? (typeof last === "number" ? last + 1 : 1) : alphabet[0]]);
  };

  const target = drag && drag.mode === "move" ? Math.max(0, Math.min(items.length - 1, drag.index + Math.round(drag.dx / STEP))) : -1;

  return (
    <div className="cells-wrap">
      <div className="cells" style={{ width: Math.max(1, items.length) * STEP + STEP }}>
        {items.map((v, i) => {
          // While one cell is being moved, the others slide out of its way.
          let offset = 0;
          if (drag?.mode === "move") {
            if (i === drag.index) offset = drag.dx;
            else if (drag.index < i && i <= target) offset = -STEP;
            else if (target <= i && i < drag.index) offset = STEP;
          }
          if (editing === i) {
            return (
              <input
                key={i}
                className="ed-cell editing"
                style={{ left: i * STEP }}
                autoFocus
                defaultValue={String(v)}
                maxLength={kind === "char" ? 1 : 6}
                inputMode={kind === "number" ? "numeric" : "text"}
                aria-label={`Item ${i + 1}`}
                onBlur={(e) => {
                  const t = e.target.value;
                  const next = kind === "number" ? parseInt(t, 10) : t;
                  if (kind === "number" ? !Number.isNaN(next) : t.length === 1 && (field.rule !== "brackets-only" || BRACKETS.includes(t))) {
                    commit(items.map((x, k) => (k === i ? (kind === "number" ? Math.max(-LIMIT, Math.min(LIMIT, next as number)) : next) : x)));
                  }
                  setEditing(null);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(null); }}
              />
            );
          }
          return (
            <button
              key={i}
              type="button"
              className={`ed-cell ${drag?.index === i ? `dragging ${drag.mode}` : ""} ${drag?.index === i && drag.overBin ? "doomed" : ""}`}
              style={{ left: i * STEP, transform: offset ? `translateX(${offset}px)` : undefined }}
              aria-label={`Item ${i + 1}: ${v}. Up and down arrows change it${sorted ? "" : ", Alt with left and right moves it"}, Delete removes it.`}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setDrag({ index: i, x0: e.clientX, y0: e.clientY, v0: v, mode: "?", dx: 0, overBin: false });
              }}
              onPointerMove={(e) => {
                if (!drag || drag.index !== i) return;
                const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
                let mode = drag.mode;
                if (mode === "?" && Math.hypot(dx, dy) > 6) mode = Math.abs(dy) > Math.abs(dx) && !(dy > 0 && Math.abs(dy) > 40) ? "value" : "move";
                if (mode === "value") {
                  const next = shift(drag.v0, Math.round(-dy / 14));
                  if (next !== items[i]) onChange(items.map((x, k) => (k === i ? next : x))); // live; rules applied on release
                }
                const r = bin.current?.getBoundingClientRect();
                const overBin = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 12 && e.clientY <= r.bottom + 12;
                setDrag({ ...drag, mode, dx, overBin });
              }}
              onPointerUp={() => {
                const d = drag;
                setDrag(null);
                if (!d) return;
                if (d.overBin) remove(i);
                else if (d.mode === "move" && !sorted && target !== i) move(i, target);
                else if (d.mode === "value") commit(items);
                else if (d.mode === "?") {
                  if (kind === "char" && field.rule === "brackets-only") commit(items.map((x, k) => (k === i ? shift(x, 1) : x)));
                  else setEditing(i);
                }
              }}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") { e.preventDefault(); commit(items.map((x, k) => (k === i ? shift(x, 1) : x))); }
                else if (e.key === "ArrowDown") { e.preventDefault(); commit(items.map((x, k) => (k === i ? shift(x, -1) : x))); }
                else if (e.altKey && e.key === "ArrowLeft" && !sorted) { e.preventDefault(); move(i, i - 1); }
                else if (e.altKey && e.key === "ArrowRight" && !sorted) { e.preventDefault(); move(i, i + 1); }
                else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(i); }
                else if (e.key === "Enter") { e.preventDefault(); setEditing(i); }
              }}
            >
              {String(v)}
            </button>
          );
        })}
        <button type="button" className="ed-cell ed-add" style={{ left: items.length * STEP }} onClick={add} disabled={items.length >= max} aria-label={`Add an item to ${field.name}`}>+</button>
      </div>
      <div ref={bin} className={`bin ${drag && drag.mode !== "value" ? "shown" : ""} ${drag?.overBin ? "hot" : ""}`} aria-hidden="true">
        <svg viewBox="0 0 20 20" width="18" height="18"><path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" /></svg>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ a tree you grow and prune
interface TNode { v: number; l: TNode | null; r: TNode | null }

function toNodes(values: (number | null)[]): TNode | null {
  if (!values.length || values[0] === null) return null;
  const root: TNode = { v: values[0], l: null, r: null };
  const queue = [root];
  let i = 1;
  while (queue.length && i < values.length) {
    const n = queue.shift()!;
    for (const side of ["l", "r"] as const) {
      if (i >= values.length) break;
      const v = values[i++];
      if (v !== null) { n[side] = { v, l: null, r: null }; queue.push(n[side]!); }
    }
  }
  return root;
}

function toValues(root: TNode | null): (number | null)[] {
  if (!root) return [];
  const out: (number | null)[] = [];
  const queue: (TNode | null)[] = [root];
  while (queue.length) {
    const n = queue.shift()!;
    out.push(n ? n.v : null);
    if (n) queue.push(n.l, n.r);
  }
  while (out.length && out.at(-1) === null) out.pop();
  return out;
}

function TreeEditor({ values, max, onChange }: { values: (number | null)[]; max: number; onChange: (v: (number | null)[]) => void }) {
  const root = toNodes(values);
  const count = values.filter((v) => v !== null).length;
  const nextValue = Math.max(0, ...values.filter((v): v is number => v !== null)) + 1;
  const DEPTH = 4;
  // Lay out by position in a full binary tree: x from the in-order slot, y from depth.
  const items: { key: string; x: number; y: number; node: TNode | null; parent?: { x: number; y: number }; attach?: () => void; remove?: () => void }[] = [];
  const walk = (n: TNode | null, depth: number, lo: number, hi: number, parent: { x: number; y: number } | undefined, setChild: ((c: TNode | null) => void) | null, path: string) => {
    const x = (lo + hi) / 2, y = depth * 64 + 28;
    if (!n) {
      if (setChild && depth < DEPTH && count < max) items.push({ key: path, x, y, node: null, parent, attach: () => setChild({ v: nextValue, l: null, r: null }) });
      return;
    }
    items.push({ key: path, x, y, node: n, parent, remove: setChild ? () => setChild(null) : undefined });
    walk(n.l, depth + 1, lo, x, { x, y }, (c) => { n.l = c; onChange(toValues(root)); }, `${path}l`);
    walk(n.r, depth + 1, x, hi, { x, y }, (c) => { n.r = c; onChange(toValues(root)); }, `${path}r`);
  };
  const W = 460;
  if (root) walk(root, 0, 0, W, undefined, null, "t");
  else items.push({ key: "t", x: W / 2, y: 28, node: null, attach: () => onChange([nextValue]) });

  return (
    <svg className="tree-ed" viewBox={`0 0 ${W} ${DEPTH * 64 + 24}`} role="group" aria-label="Tree: tap an empty circle to add a node, tap a node to remove it">
      {items.filter((it) => it.parent).map((it) => (
        <line key={`e${it.key}`} x1={it.parent!.x} y1={it.parent!.y} x2={it.x} y2={it.y} className={it.node ? "tree-edge" : "tree-edge ghost"} />
      ))}
      {items.map((it) => it.node ? (
        <g key={it.key} className={`tnode ${it.remove ? "removable" : ""}`} transform={`translate(${it.x} ${it.y})`} role="button" tabIndex={it.remove ? 0 : -1}
          aria-label={it.remove ? `Node ${it.node.v}: remove it and everything under it` : `Root ${it.node.v}`}
          onClick={it.remove} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === "Delete" || e.key === "Backspace") && it.remove) { e.preventDefault(); it.remove(); } }}>
          <circle r="19" /><text dy="5" textAnchor="middle">{it.node.v}</text>
        </g>
      ) : (
        <g key={it.key} className="tnode ghost" transform={`translate(${it.x} ${it.y})`} role="button" tabIndex={0} aria-label="Add a node here"
          onClick={it.attach} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); it.attach?.(); } }}>
          <circle r="13" /><text dy="5" textAnchor="middle">+</text>
        </g>
      ))}
    </svg>
  );
}
