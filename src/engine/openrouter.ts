// Minimal OpenRouter client: chat completions (streamed or not), the model
// catalog, and a key check. OpenRouter's API is OpenAI-compatible and allows
// browser calls (CORS), so this runs in the page on both the web and desktop.

const BASE = "https://openrouter.ai/api/v1";
const APP_HEADERS = { "X-OpenRouter-Title": "Multimodel vs Multimodal" };

export interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
}

export interface CatalogModel {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** Turns an HTTP status into a message a non-developer can act on. */
function explain(status: number | undefined, message: string): string {
  switch (status) {
    case 401:
      return "Your OpenRouter key was rejected. Remove it below and add a valid one.";
    case 402:
      return "Your OpenRouter account is out of credits. Add credits at openrouter.ai/settings/credits.";
    case 403:
      return `OpenRouter blocked this request: ${message}`;
    case 408:
      return "The model took too long to respond. Try again.";
    case 429:
      return "Rate limit reached. Wait a moment and run again.";
    case 502:
    case 503:
      return "That model is unavailable right now. Try again in a minute.";
    default:
      return message ? `OpenRouter error${status ? ` ${status}` : ""}: ${message}` : `OpenRouter error ${status}`;
  }
}

async function failure(res: Response): Promise<OpenRouterError> {
  let message = res.statusText;
  try {
    const body = await res.json();
    message = body?.error?.message ?? message;
  } catch {
    /* body wasn't JSON */
  }
  return new OpenRouterError(explain(res.status, message), res.status);
}

const headers = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  ...APP_HEADERS,
});

/** Streams a chat completion, calling onText per chunk. */
export async function streamChat(
  apiKey: string,
  body: ChatRequest,
  { signal, onText }: { signal: AbortSignal; onText: (text: string) => void },
): Promise<{ text: string; usage: Usage | null; model: string }> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) throw await failure(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let usage: Usage | null = null;
  let model = body.model;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Server-sent events: one "data: {...}" per line; ":" lines are keep-alive comments.
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;

      let chunk;
      try {
        chunk = JSON.parse(data);
      } catch {
        continue;
      }
      if (chunk.error) throw new OpenRouterError(explain(chunk.error.code, chunk.error.message), chunk.error.code);
      if (chunk.model) model = chunk.model;
      if (chunk.usage) usage = chunk.usage;
      const piece: string | undefined = chunk.choices?.[0]?.delta?.content;
      if (piece) {
        text += piece;
        onText(piece);
      }
    }
  }
  return { text, usage, model };
}

/** A non-streamed chat completion, used for the planner's JSON reply. */
export async function chat(
  apiKey: string,
  body: ChatRequest,
  { signal }: { signal: AbortSignal },
): Promise<{ text: string; usage: Usage | null; model: string }> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await failure(res);
  const json = await res.json();
  if (json.error) throw new OpenRouterError(explain(json.error.code, json.error.message), json.error.code);
  return { text: json.choices?.[0]?.message?.content ?? "", usage: json.usage ?? null, model: json.model ?? body.model };
}

// The public catalog gives each model's display name and per-token price.
let catalogPromise: Promise<Map<string, CatalogModel>> | null = null;
export function catalog(): Promise<Map<string, CatalogModel>> {
  catalogPromise ??= fetch(`${BASE}/models`)
    .then((r) => (r.ok ? r.json() : { data: [] }))
    .then((j: { data?: CatalogModel[] }) => new Map((j.data ?? []).map((m) => [m.id, m])))
    .catch(() => {
      catalogPromise = null; // retry next time
      return new Map<string, CatalogModel>();
    });
  return catalogPromise;
}

/** Confirms a key works with one authenticated request that costs nothing. */
export async function checkKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/key`, { headers: headers(apiKey) });
    if (res.ok) return { ok: true };
    return { ok: false, error: (await failure(res)).message };
  } catch {
    return { ok: false, error: "Couldn't reach OpenRouter. Check your internet connection." };
  }
}
