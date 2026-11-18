// Pillow's API server: explains problems that aren't in the library yet. It holds the API key (the
// browser never sees it), runs untrusted code only in the sandbox, and caches every result.
//
//   GET  /api/health              {ok, explain}  (explain: false without an API key)
//   POST /api/explain {query}     Server-Sent Events: status, problem, ready, error
//   GET  /api/problems/<slug>     a generated film's data
//
// Run with `npm run server`. In development Vite proxies /api here.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { Sandbox } from "../engine/sandbox/sandbox";
import { fixtureSource } from "../engine/testing/trace";
import { PROBLEMS } from "../src/content/problems";
import { ClaudeDrafter, type DraftModel } from "../pipeline/drafter";
import { problemToBrief, problemToDraft } from "../pipeline/fromProblem";
import { ClaudeIdentifier, type IdentifyModel } from "../pipeline/identify";
import { systemPrompt } from "../pipeline/prompt";
import { type ExplainEvent, Explainer } from "./explain";

const MAX_BODY = 16_000;

export async function startServer({ port, cacheDir, identifier, drafter, canExplain }: {
  port: number; cacheDir: string; identifier: IdentifyModel; drafter: DraftModel; canExplain: boolean;
}) {
  const sandbox = new Sandbox();
  const two = PROBLEMS.find((p) => p.slug === "two-sum")!;
  const system = systemPrompt({ brief: await problemToBrief(two, fixtureSource, (r) => sandbox.trace(r)), draft: problemToDraft(two, fixtureSource) });
  const explainer = new Explainer({ identifier, drafter, sandbox, cacheDir, system });

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://local");
      if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { ok: true, explain: canExplain });
      const m = url.pathname.match(/^\/api\/problems\/([a-z0-9-]+)$/);
      if (req.method === "GET" && m) {
        const found = explainer.get(m[1]);
        return found ? json(res, 200, found) : json(res, 404, { error: "not found" });
      }
      if (req.method === "POST" && url.pathname === "/api/explain") {
        const body = JSON.parse(await readBody(req)) as { query?: unknown };
        const query = typeof body.query === "string" ? body.query.trim() : "";
        if (!query) return json(res, 400, { error: "Type a problem to explain." });
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        const send = (e: ExplainEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`);
        if (!canExplain) { send({ type: "error", message: "Pillow's server isn't set up to explain new problems yet (no API key)." }); return res.end(); }
        const ping = setInterval(() => res.write(": ping\n\n"), 15_000);
        await explainer.explain(query, send);
        clearInterval(ping);
        return res.end();
      }
      json(res, 404, { error: "not found" });
    } catch (e) {
      if (!res.headersSent) json(res, 400, { error: (e as Error).message });
      else res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  return { server, close: () => { server.close(); sandbox.close(); } };
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > MAX_BODY) { reject(new Error("Request too large.")); req.destroy(); } });
    req.on("end", () => resolve(data || "{}"));
    req.on("error", reject);
  });
}

// `npm run server`
if (import.meta.url === `file://${process.argv[1]}`) {
  const canExplain = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
  const port = Number(process.env.PORT ?? 8787);
  await startServer({ port, cacheDir: join(import.meta.dirname, "..", "content", "generated"), identifier: new ClaudeIdentifier(), drafter: new ClaudeDrafter(), canExplain });
  console.log(`Pillow API on http://localhost:${port}${canExplain ? "" : " (explaining new problems is off: no ANTHROPIC_API_KEY)"}`);
}
