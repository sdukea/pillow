import { useEffect, useMemo, useState } from "react";
import { prepare, type Prepared } from "../../engine/interpreter/viewmodel";
import type { Trace } from "../../engine/tracer/types";
import { LAB, labFile } from "../content/lab";
import { Canvas } from "../views/Canvas";

// Development only: step through each lab fixture to see a view draw from a real trace.

const SOURCES = import.meta.glob("../../engine/tracer/fixtures/*.py", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const TRACES = import.meta.glob("../generated/lab--*.json", { import: "default" }) as Record<string, () => Promise<Trace>>;

export function Lab({ id }: { id: string | null }) {
  const entry = LAB.find((e) => e.id === id) ?? LAB[0];
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    setPrepared(null); setI(0);
    TRACES[`../generated/${labFile(entry)}`]?.().then((t) => setPrepared(prepare(t, entry.spec)));
  }, [entry]);
  const source = SOURCES[`../../engine/tracer/fixtures/${entry.solution}.py`]?.trimEnd().split("\n") ?? [];
  const view = useMemo(() => prepared?.view(i), [prepared, i]);
  return (
    <main className="lab">
      <nav className="lab-nav">{LAB.map((e) => <a key={e.id} href={`?v=${e.id}`} className={e.id === entry.id ? "on" : ""}>{e.id}</a>)}</nav>
      <h1>{entry.title}</h1>
      {view && prepared && (
        <>
          <div className="lab-controls">
            <button type="button" className="btn-gray" onClick={() => setI(Math.max(0, i - 1))}>Back</button>
            <span className="lab-count">{i + 1} / {prepared.moments.length}</span>
            <button type="button" className="btn-filled" onClick={() => setI(Math.min(prepared.moments.length - 1, i + 1))}>Forward</button>
            <input type="range" min={0} max={prepared.moments.length - 1} value={i} onChange={(e) => setI(Number(e.target.value))} aria-label="Moment" />
          </div>
          <p className="lab-narration">{view.narration ?? " "}</p>
          <div className="lab-body">
            <pre className="lab-code">{source.map((l, n) => <div key={n} className={n + 1 === view.ranLine ? "ran" : ""}>{String(n + 1).padStart(2)}  {l}</div>)}</pre>
            <Canvas views={view.views} />
          </div>
        </>
      )}
    </main>
  );
}
