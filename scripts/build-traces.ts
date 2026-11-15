// Precomputes the trace for every problem's example input, and validates each visualization spec
// against it. Fails the build if any trace errors or any spec has a problem.
//   npm run traces
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validateSpec } from "../engine/interpreter/validate";
import type { Trace } from "../engine/tracer/types";
import { PROBLEMS, traceFile } from "../src/content/problems";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "src", "generated");
mkdirSync(OUT, { recursive: true });

let failures = 0;
for (const problem of PROBLEMS) {
  for (const approach of problem.approaches) {
    const source = readFileSync(join(ROOT, "engine", "tracer", "fixtures", `${approach.solution}.py`), "utf8");
    const run = spawnSync("python3", [join(ROOT, "engine", "tracer", "tracer.py")], {
      input: JSON.stringify({ source, entry: approach.entry, args: problem.example }),
      env: { ...process.env, PYTHONHASHSEED: "0" },
      encoding: "utf8",
    });
    const name = `${problem.slug} / ${approach.name}`;
    if (run.status !== 0) {
      console.error(`✗ ${name}: the tracer crashed\n${run.stderr}`);
      failures++;
      continue;
    }
    const trace = JSON.parse(run.stdout) as Trace;
    const problems = trace.ok ? validateSpec(approach.spec, source, [trace]) : [{ where: "trace", message: `${trace.error?.type}: ${trace.error?.message}` }];
    if (problems.length) {
      console.error(`✗ ${name}\n${problems.map((p) => `    ${p.where}: ${p.message}`).join("\n")}`);
      failures++;
      continue;
    }
    writeFileSync(join(OUT, traceFile(problem, approach)), JSON.stringify(trace));
    console.log(`✓ ${name}: ${trace.steps.length} steps`);
  }
}
if (failures) {
  console.error(`\n${failures} trace(s) failed.`);
  process.exit(1);
}
