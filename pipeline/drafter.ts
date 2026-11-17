// The drafting loop: ask the model for a draft, validate it, and if anything fails, send the
// failures back and ask for a corrected draft, up to a fixed number of attempts. The model never
// decides whether its draft is good; the validator does. Nothing here publishes anything.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Sandbox } from "../engine/sandbox/sandbox";
import type { Brief, Draft } from "../src/content/draft";
import { briefPrompt, repairPrompt } from "./prompt";
import { DraftSchema } from "./schema";
import { type Report, validateDraft } from "./validate";

export type Turn = Anthropic.Beta.BetaMessageParam;

/** The one thing the loop needs from a model. Tests script it; scripts/draft.ts uses Claude. */
export interface DraftModel {
  readonly id: string;
  /** Returns the parsed draft (or null if the output didn't parse) and the content to keep in the conversation. */
  complete(system: string, turns: Turn[]): Promise<{ draft: unknown; content: Anthropic.Beta.BetaContentBlock[]; usage?: string }>;
}

export interface Attempt { draft: unknown; report: Report; usage?: string }

export async function draftLesson(
  brief: Brief,
  model: DraftModel,
  system: string,
  sandbox: Sandbox,
  { attempts = 3, onAttempt }: { attempts?: number; onAttempt?: (n: number, a: Attempt) => void | Promise<void> } = {},
): Promise<{ ok: boolean; attempts: Attempt[]; draft?: Draft }> {
  const turns: Turn[] = [{ role: "user", content: briefPrompt(brief) }];
  const history: Attempt[] = [];
  for (let n = 1; n <= attempts; n++) {
    const { draft, content, usage } = await model.complete(system, turns);
    const report = draft === null
      ? { ok: false, checks: [{ name: "shape" as const, ok: false, problems: ["the response wasn't a complete JSON draft matching the schema"] }] }
      : await validateDraft(brief, draft, sandbox);
    const attempt = { draft, report, usage };
    history.push(attempt);
    await onAttempt?.(n, attempt);
    if (report.ok) return { ok: true, attempts: history, draft: DraftSchema.parse(draft) };
    // Keep the conversation append-only: the model's full reply (thinking included), then the failures.
    turns.push({ role: "assistant", content }, { role: "user", content: repairPrompt(report) });
  }
  return { ok: false, attempts: history };
}

/** Claude as the drafter: Opus 5.5, adaptive thinking, structured output, streamed. */
export class ClaudeDrafter implements DraftModel {
  readonly id = "claude-opus-5-5";
  private client = new Anthropic();

  async complete(system: string, turns: Turn[]) {
    const stream = this.client.beta.messages.stream({
      model: this.id,
      max_tokens: 64_000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: betaZodOutputFormat(DraftSchema) },
      // The system prompt is identical across attempts and problems, so cache it.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: turns,
      // If a safety classifier declines, let the API route the request to a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") throw new Error(`The model declined to draft this lesson (${message.stop_details?.category ?? "no category"}).`);
    if (message.stop_reason === "max_tokens") return { draft: null, content: message.content, usage: usage(message) };
    return { draft: message.parsed_output ?? null, content: message.content, usage: usage(message) };
  }
}

function usage(m: Anthropic.Beta.BetaMessage): string {
  const u = m.usage;
  return `${m.model}: ${u.input_tokens} in (+${u.cache_read_input_tokens ?? 0} cached, +${u.cache_creation_input_tokens ?? 0} written), ${u.output_tokens} out`;
}
