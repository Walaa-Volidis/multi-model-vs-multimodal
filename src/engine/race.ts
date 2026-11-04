// Runs the user's files and question through real models on OpenRouter.
//
//   multi  (multi-model)  detect inputs → an AI planner picks specialists from
//                         different companies → each reads its files → a final
//                         model writes the answer from their notes
//   single (multimodal)   one model receives every file and the question at once
//
// The user can run either lane alone, or both side by side.

import type { Lane, RaceEvent, RaceFile, RaceMode, StepInfo } from "@/lib/race";
import { ROSTER, SPECIALISTS, SPECIALIST_KEYS, type FileKind, type ModelEntry, type SpecialistKey } from "./models";
import { catalog, chat, streamChat, type ChatMessage, type ContentPart, type Usage } from "./openrouter";

const ANSWER_STYLE =
  "Answer in plain language for a curious non-expert, in under 150 words. Lead with the direct answer.";
const MAX_STEPS = 6;

type Emit = (event: RaceEvent) => void;
type LaneEvent = Extract<RaceEvent, { lane: Lane }>;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

// ── Files ─────────────────────────────────────────────────────────────────

export function kindOf(file: RaceFile): FileKind {
  if (file.mediaType.startsWith("image/")) return "image";
  if (file.mediaType.startsWith("audio/")) return "audio";
  if (file.mediaType === "application/pdf") return "pdf";
  return "text";
}

const AUDIO_FORMATS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/aac": "aac",
};

function decodeText(file: RaceFile): string {
  const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** One file as an OpenAI-compatible content part. */
function part(file: RaceFile): ContentPart {
  switch (kindOf(file)) {
    case "image":
      return { type: "image_url", image_url: { url: `data:${file.mediaType};base64,${file.data}` } };
    case "audio":
      return { type: "input_audio", input_audio: { data: file.data, format: AUDIO_FORMATS[file.mediaType] ?? "mp3" } };
    case "pdf":
      return { type: "file", file: { filename: file.name, file_data: `data:application/pdf;base64,${file.data}` } };
    default:
      return { type: "text", text: `<file name="${file.name}">\n${decodeText(file)}\n</file>` };
  }
}

const KIND_WORDS: Record<FileKind, [string, string]> = {
  image: ["image", "images"],
  audio: ["audio clip", "audio clips"],
  pdf: ["PDF", "PDFs"],
  text: ["text file", "text files"],
};

export function describeInputs(files: RaceFile[]) {
  const counts: Partial<Record<FileKind, number>> = {};
  for (const f of files) counts[kindOf(f)] = (counts[kindOf(f)] ?? 0) + 1;
  const parts = Object.entries(counts).map(([k, n]) => `${n} ${KIND_WORDS[k as FileKind][n > 1 ? 1 : 0]}`);
  const modalities = new Set(["text", ...Object.keys(counts).map((k) => (k === "pdf" ? "document" : k))]);
  return { summary: [...parts, "your question"].join(", "), modalities: [...modalities] };
}

// ── Accounting ────────────────────────────────────────────────────────────

interface Totals {
  models: Map<string, string>;
  costUsd: number;
  handoffs: number;
}
const newTotals = (): Totals => ({ models: new Map(), costUsd: 0, handoffs: 0 });

async function record(totals: Totals, model: string, usage: Usage | null) {
  const meta = (await catalog()).get(model);
  totals.models.set(model, meta?.name ?? model);
  if (!usage) return;
  if (typeof usage.cost === "number") {
    totals.costUsd += usage.cost;
  } else if (meta?.pricing) {
    totals.costUsd +=
      (usage.prompt_tokens ?? 0) * Number(meta.pricing.prompt ?? 0) +
      (usage.completion_tokens ?? 0) * Number(meta.pricing.completion ?? 0);
  }
}

async function labelFor(entry: ModelEntry): Promise<string> {
  // Catalog names look like "Meta: Llama 4 Maverick"; fall back to the id.
  return (await catalog()).get(entry.id)?.name ?? `${entry.vendor}: ${entry.id.split("/")[1]}`;
}

const isAbort = (err: unknown) => (err as Error)?.name === "AbortError";
const message = (err: unknown) => (err as Error)?.message ?? String(err);

/** Everything one lane needs to report progress. */
class LaneRun {
  readonly totals = newTotals();
  readonly started = Date.now();

  constructor(
    readonly runId: string,
    readonly lane: Lane,
    private readonly emitRaw: Emit,
    readonly apiKey: string,
    readonly signal: AbortSignal,
  ) {}

  emit(event: DistributiveOmit<LaneEvent, "runId" | "lane">) {
    this.emitRaw({ ...event, runId: this.runId, lane: this.lane } as RaceEvent);
  }

  finish(ok: boolean) {
    this.emit({
      type: "lane-done",
      stats: {
        ok,
        models: [...this.totals.models.values()],
        handoffs: this.totals.handoffs,
        ms: Date.now() - this.started,
        costUsd: this.totals.costUsd,
      },
    });
  }

  /** A step that runs in the app (no model): emitted complete in one go. */
  local(step: Omit<StepInfo, "modelLabel">, text: string) {
    this.emit({ type: "step", step: { ...step, modelLabel: "No model: runs in the app" } });
    this.emit({ type: "delta", stepId: step.id, text });
    this.emit({ type: "step-done", stepId: step.id, ms: 0 });
  }

  /** Runs one streamed model call and emits its lifecycle. Returns the model's text. */
  async step(step: Omit<StepInfo, "modelLabel">, entry: ModelEntry, messages: ChatMessage[]): Promise<string> {
    this.emit({ type: "step", step: { ...step, modelLabel: await labelFor(entry) } });
    const started = Date.now();
    try {
      const { text, usage, model } = await streamChat(
        this.apiKey,
        { model: entry.id, messages, max_tokens: 4000 },
        { signal: this.signal, onText: (chunk) => this.emit({ type: "delta", stepId: step.id, text: chunk }) },
      );
      await record(this.totals, model ?? entry.id, usage);
      this.emit({ type: "step-done", stepId: step.id, ms: Date.now() - started });
      return text;
    } catch (err) {
      if (!isAbort(err)) this.emit({ type: "step-error", stepId: step.id, message: message(err) });
      throw err;
    }
  }
}

// ── The planner ───────────────────────────────────────────────────────────

interface PlanStep {
  specialist: SpecialistKey;
  files: RaceFile[];
  instruction: string;
  why: string;
}

function plannerPrompt(question: string, files: RaceFile[]): string {
  const roster = SPECIALIST_KEYS.map((key) => {
    const s = SPECIALISTS[key];
    const reads = s.reads.length ? `opens: ${s.reads.join(", ")}` : "opens no files; works on other specialists' text";
    return `- "${key}" (${s.vendor}): ${s.job} (${reads})`;
  }).join("\n");
  const fileList = files.length ? files.map((f) => `- ${f.name} (${kindOf(f)})`).join("\n") : "- (no files)";

  return [
    "You plan which AI specialists to call for a user's request. Each specialist is a different AI model from a different company.",
    `Specialists:\n${roster}`,
    `Files the user attached:\n${fileList}`,
    `User's question: ${question}`,
    "Rules: every image, audio, and PDF file must be given to a specialist that opens that kind of file. " +
      'Text files need no specialist. Add a "language" step only when the request needs translation, rewriting, or extraction ' +
      `after reading. Use at most ${MAX_STEPS} steps. A separate final model will write the answer, so don't add one.`,
    'Reply with JSON only, in this shape: {"steps":[{"specialist":"vision","files":["photo.jpg"],"instruction":"what this specialist should do","why":"one short sentence a beginner understands"}]}',
  ].join("\n\n");
}

/** Keeps only valid steps, then adds any reader the planner forgot. */
export function validatePlan(raw: unknown, files: RaceFile[]): { steps: PlanStep[]; notes: string[] } {
  const byName = new Map(files.map((f) => [f.name, f]));
  const notes: string[] = [];
  const steps: PlanStep[] = [];
  const rawSteps = (raw as { steps?: unknown })?.steps;

  for (const s of Array.isArray(rawSteps) ? (rawSteps as Record<string, unknown>[]) : []) {
    const key = s?.specialist as SpecialistKey;
    if (!SPECIALIST_KEYS.includes(key)) continue;
    const entry = SPECIALISTS[key];
    const stepFiles = (Array.isArray(s.files) ? (s.files as string[]) : [])
      .map((n) => byName.get(n))
      .filter((f): f is RaceFile => Boolean(f) && entry.reads.includes(kindOf(f!)));
    if (entry.reads.length && stepFiles.length === 0) continue; // a reader with nothing it can read
    steps.push({
      specialist: key,
      files: stepFiles,
      instruction: String(s.instruction ?? "").slice(0, 400) || "Report what's relevant to the question.",
      why: String(s.why ?? "").slice(0, 200),
    });
  }

  for (const f of files) {
    const kind = kindOf(f);
    if (kind === "text" || steps.some((s) => s.files.includes(f))) continue;
    const key = SPECIALIST_KEYS.find((k) => SPECIALISTS[k].reads.includes(kind))!;
    steps.push({
      specialist: key,
      files: [f],
      instruction: "Report everything relevant to the question.",
      why: `${f.name} needs a model that opens ${kind} files.`,
    });
    notes.push(`added ${key} for ${f.name}`);
  }
  return { steps: steps.slice(0, MAX_STEPS), notes };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const notesBlock = (outputs: { who: string; text: string }[]) =>
  outputs.map((o) => `<notes from="${o.who}">\n${o.text}\n</notes>`).join("\n\n");

// ── Lane 1: multi-model ───────────────────────────────────────────────────

async function runMultiModel(run: LaneRun, question: string, files: RaceFile[]) {
  try {
    // 1. Detect what kinds of input arrived.
    const { summary, modalities } = describeInputs(files);
    run.local(
      { id: "detect", title: "Analyzing your input", role: "detect" },
      `Received: ${summary}.\nModalities: ${modalities.join(", ")}.`,
    );

    // 2. A real model plans which specialists to use.
    run.emit({ type: "step", step: { id: "plan", title: "Selecting AI specialists", role: "planner", modelLabel: await labelFor(ROSTER.planner) } });
    const planStarted = Date.now();
    let plan: ReturnType<typeof validatePlan>;
    try {
      const reply = await chat(
        run.apiKey,
        {
          model: ROSTER.planner.id,
          messages: [{ role: "user", content: plannerPrompt(question, files) }],
          response_format: { type: "json_object" },
          max_tokens: 1500,
        },
        { signal: run.signal },
      );
      await record(run.totals, reply.model, reply.usage);
      plan = validatePlan(parseJson(reply.text), files);
    } catch (err) {
      if (!isAbort(err)) run.emit({ type: "step-error", stepId: "plan", message: message(err) });
      throw err;
    }

    const planText = plan.steps.length
      ? plan.steps
          .map((s) => {
            const reads = s.files.length ? ` reads ${s.files.map((f) => f.name).join(", ")}` : "";
            return `${s.specialist} → ${SPECIALISTS[s.specialist].vendor}${reads}\n  ${s.why || s.instruction}`;
          })
          .join("\n") + (plan.notes.length ? `\n(the app ${plan.notes.join("; ")})` : "")
      : "No specialists needed: the final model can answer from your question and text files directly.";
    run.emit({ type: "delta", stepId: "plan", text: planText });
    run.emit({ type: "step-done", stepId: "plan", ms: Date.now() - planStarted });

    // 3a. Readers run in parallel, each on its own files.
    const readers = plan.steps.filter((s) => SPECIALISTS[s.specialist].reads.length);
    const writers = plan.steps.filter((s) => !SPECIALISTS[s.specialist].reads.length);
    const outputs: { who: string; text: string }[] = [];

    const readerOutputs = await Promise.all(
      readers.map((s, i) => {
        const entry = SPECIALISTS[s.specialist];
        return run
          .step(
            { id: `spec-${i}`, title: `${cap(s.specialist)} specialist`, detail: s.instruction, role: "specialist" },
            entry,
            [
              {
                role: "system",
                content:
                  `You are the ${s.specialist} specialist in a team of AI models. Another model will write the final answer from ` +
                  "your notes and cannot see the files. Be factual and specific: exact text, numbers, names. Don't answer the user's question yourself.",
              },
              {
                role: "user",
                content: [...s.files.map(part), { type: "text", text: `Your task: ${s.instruction}\nThe user's question: ${question}` }],
              },
            ],
          )
          .then((text) => ({ who: `${s.specialist} (${entry.vendor})`, text }));
      }),
    );
    outputs.push(...readerOutputs);

    // 3b. Text-only specialists run in order, each seeing everything so far.
    for (const [i, s] of writers.entries()) {
      const entry = SPECIALISTS[s.specialist];
      const text = await run.step(
        { id: `lang-${i}`, title: `${cap(s.specialist)} specialist`, detail: s.instruction, role: "specialist" },
        entry,
        [
          { role: "system", content: "You are a text specialist in a team of AI models. Work only from the notes given. Don't answer the user's question yourself." },
          { role: "user", content: `${notesBlock(outputs)}\n\nYour task: ${s.instruction}\nThe user's question: ${question}` },
        ],
      );
      outputs.push({ who: `${s.specialist} (${entry.vendor})`, text });
    }
    run.totals.handoffs = outputs.length;

    // 4. Final answer from notes (plus any text files), never the raw media.
    const textFiles = files.filter((f) => kindOf(f) === "text");
    await run.step(
      { id: "final", title: outputs.length ? "Final model combines the specialists' work" : "Final model answers", role: "final" },
      ROSTER.final,
      [
        {
          role: "system",
          content:
            "You write the final answer in a team of AI models. You can't see the user's images, audio, or PDFs; you only have the " +
            "specialists' notes and any text files. If the notes leave something out, say so rather than guessing. " +
            ANSWER_STYLE,
        },
        {
          role: "user",
          content: [notesBlock(outputs), ...textFiles.map((f) => `<file name="${f.name}">\n${decodeText(f)}\n</file>`), `Question: ${question}`]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    );
    run.finish(true);
  } catch (err) {
    run.finish(false);
    if (!isAbort(err)) throw err;
  }
}

// ── Lane 2: multimodal ────────────────────────────────────────────────────

async function runMultimodal(run: LaneRun, question: string, files: RaceFile[]) {
  try {
    const { summary } = describeInputs(files);
    await run.step(
      { id: "single", title: "One model reads everything at once", detail: `Receives ${summary} in a single request`, role: "final" },
      ROSTER.multimodal,
      [
        { role: "system", content: "You can see, hear, and read every file the user attached. Use them directly. " + ANSWER_STYLE },
        { role: "user", content: [...files.map(part), { type: "text", text: `Question: ${question}` }] },
      ],
    );
    run.finish(true);
  } catch (err) {
    run.finish(false);
    if (!isAbort(err)) throw err;
  }
}

export interface RaceRequest {
  runId: string;
  mode: RaceMode;
  question: string;
  files: RaceFile[];
}

/** Runs the chosen lane(s): "multi", "single", or "both" (concurrently). Never rejects. */
export async function runRace(apiKey: string, request: RaceRequest, emit: Emit, signal: AbortSignal): Promise<void> {
  const { runId, mode, question, files } = request;
  const lanes: Promise<void>[] = [];
  if (mode !== "single") lanes.push(runMultiModel(new LaneRun(runId, "multi", emit, apiKey, signal), question, files));
  if (mode !== "multi") lanes.push(runMultimodal(new LaneRun(runId, "single", emit, apiKey, signal), question, files));
  await Promise.allSettled(lanes);
  emit({ runId, type: "run-done" });
}
