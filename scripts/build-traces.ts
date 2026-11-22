// Precomputes the trace for every problem's example input, and validates each visualization spec
// against it. Fails the build if any trace errors or any spec has a problem.
//   npm run traces
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validateSpec } from "../engine/interpreter/validate";
import type { Arg, Trace } from "../engine/tracer/types";
import { growthFile, PROBLEMS, traceFile } from "../src/content/problems";
import { LAB, labFile } from "../src/content/lab";
import { measureLesson } from "../src/content/measure";
import { type Measured, validateLesson } from "../src/content/validateLesson";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "src", "generated");
mkdirSync(OUT, { recursive: true });

function runTracer(source: string, entry: string, args: Arg[], extra: { countOnly?: boolean; maxSteps?: number } = {}): Trace {
  const run = spawnSync("python3", [join(ROOT, "engine", "tracer", "tracer.py")], {
    input: JSON.stringify({ source, entry, args, ...extra }),
    env: { ...process.env, PYTHONHASHSEED: "0" },
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (run.status !== 0) throw new Error(`the tracer crashed\n${run.stderr}`);
  return JSON.parse(run.stdout) as Trace;
}

const sourceOf = (solution: string) => readFileSync(join(ROOT, "engine", "tracer", "fixtures", `${solution}.py`), "utf8");

let failures = 0;
for (const problem of PROBLEMS) {
  for (const approach of problem.approaches) {
    const source = sourceOf(approach.solution);
    const name = `${problem.slug} / ${approach.name}`;
    let trace: Trace;
    try {
      trace = runTracer(source, approach.entry, problem.example);
    } catch (e) {
      console.error(`✗ ${name}: ${(e as Error).message}`);
      failures++;
      continue;
    }
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
// The view lab: same tracing and validation as lessons.
for (const entry of LAB) {
  const source = sourceOf(entry.solution);
  const trace = runTracer(source, entry.entry, entry.args);
  const problems = trace.ok ? validateSpec(entry.spec, source, [trace]) : [{ where: "trace", message: `${trace.error?.type}: ${trace.error?.message}` }];
  if (problems.length) {
    console.error(`✗ lab / ${entry.id}\n${problems.map((p) => `    ${p.where}: ${p.message}`).join("\n")}`);
    failures++;
    continue;
  }
  writeFileSync(join(OUT, labFile(entry)), JSON.stringify(trace));
  console.log(`✓ lab / ${entry.id}: ${trace.steps.length} steps`);
}

// Lessons: measure how each approach's work and memory grow, and check every claim.
for (const problem of PROBLEMS) {
  if (!problem.lesson) continue;
  let measured: Measured;
  try {
    measured = await measureLesson(problem, sourceOf, (request) => runTracer(request.source, request.entry, request.args, { countOnly: request.countOnly, maxSteps: request.maxSteps }));
  } catch (e) {
    console.error(`✗ ${problem.slug} growth: ${(e as Error).message}`);
    failures++;
    continue;
  }
  const problems = validateLesson(problem, measured);
  if (problems.length) {
    console.error(`✗ ${problem.slug} lesson\n${problems.map((p) => `    ${p}`).join("\n")}`);
    failures++;
    continue;
  }
  writeFileSync(join(OUT, growthFile(problem)), JSON.stringify(measured));
  console.log(`✓ ${problem.slug} lesson: ${problem.approaches.map((a) => `${a.name} ${measured.approaches[a.id].steps.join("/")} steps`).join(", ")}`);
}

if (failures) {
  console.error(`\n${failures} trace(s) failed.`);
  process.exit(1);
}
