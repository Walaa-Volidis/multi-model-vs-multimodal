// Types shared with src/engine/race.ts (which emits these events) and a reducer
// that turns the event stream into what the two lanes render.

export type Lane = "multi" | "single";
/** Which lane(s) to run: one approach on its own, or both side by side. */
export type RaceMode = Lane | "both";

export const lanesFor = (mode: RaceMode): Lane[] => (mode === "both" ? ["multi", "single"] : [mode]);

export interface RaceFile {
  name: string;
  mediaType: string;
  /** base64, no data: prefix */
  data: string;
  size: number;
}

export interface StepInfo {
  id: string;
  title: string;
  detail?: string;
  role: "detect" | "planner" | "specialist" | "final";
  modelLabel?: string;
}

export interface LaneStats {
  ok: boolean;
  models: string[];
  handoffs: number;
  ms: number;
  costUsd: number;
}

export type RaceEvent = { runId: string } & (
  | { lane: Lane; type: "step"; step: StepInfo }
  | { lane: Lane; type: "delta"; stepId: string; text: string }
  | { lane: Lane; type: "step-done"; stepId: string; ms: number; usage?: { input: number; output: number } }
  | { lane: Lane; type: "step-error"; stepId: string; message: string }
  | { lane: Lane; type: "lane-done"; stats: LaneStats }
  | { type: "run-done" }
);

/** The desktop app's encrypted key store (electron/preload.cjs). */
export interface DesktopAI {
  keyStatus(): Promise<{ hasKey: boolean; source: "saved" | "env" | null }>;
  getKey(): Promise<string | null>;
  saveKey(key: string): Promise<{ ok: boolean; error?: string }>;
  clearKey(): Promise<{ ok: boolean }>;
}

// ── Reducer ───────────────────────────────────────────────────────────────

export interface StepState extends StepInfo {
  status: "running" | "done" | "error";
  text: string;
  ms?: number;
  error?: string;
}

export interface LaneState {
  steps: StepState[];
  stats?: LaneStats;
}

export interface RaceState {
  runId: string | null;
  mode: RaceMode;
  running: boolean;
  startedAt: number | null;
  lanes: Record<Lane, LaneState>;
}

export const emptyRace: RaceState = {
  runId: null,
  mode: "both",
  running: false,
  startedAt: null,
  lanes: { multi: { steps: [] }, single: { steps: [] } },
};

export type RaceAction =
  | { type: "start"; runId: string; mode: RaceMode }
  | { type: "event"; event: RaceEvent }
  | { type: "stop" }
  | { type: "reset" };

function updateStep(lane: LaneState, stepId: string, patch: (s: StepState) => Partial<StepState>): LaneState {
  return { ...lane, steps: lane.steps.map((s) => (s.id === stepId ? { ...s, ...patch(s) } : s)) };
}

export function raceReducer(state: RaceState, action: RaceAction): RaceState {
  switch (action.type) {
    case "start":
      return { ...emptyRace, runId: action.runId, mode: action.mode, running: true, startedAt: Date.now() };
    case "stop":
      return { ...state, running: false };
    case "reset":
      return emptyRace;
    case "event": {
      const e = action.event;
      if (e.runId !== state.runId) return state; // stale event from a cancelled run
      if (e.type === "run-done") return { ...state, running: false };

      const lane = state.lanes[e.lane];
      let next: LaneState = lane;
      switch (e.type) {
        case "step":
          next = { ...lane, steps: [...lane.steps, { ...e.step, status: "running", text: "" }] };
          break;
        case "delta":
          next = updateStep(lane, e.stepId, (s) => ({ text: s.text + e.text }));
          break;
        case "step-done":
          next = updateStep(lane, e.stepId, () => ({ status: "done", ms: e.ms }));
          break;
        case "step-error":
          next = updateStep(lane, e.stepId, () => ({ status: "error", error: e.message }));
          break;
        case "lane-done":
          next = { ...lane, stats: e.stats };
          break;
      }
      return { ...state, lanes: { ...state.lanes, [e.lane]: next } };
    }
  }
}

// ── File intake ───────────────────────────────────────────────────────────

export const ACCEPTED_TYPES: Record<string, string> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/wave": "audio",
  "audio/mp4": "audio",
  "audio/x-m4a": "audio",
  "audio/ogg": "audio",
  "audio/flac": "audio",
  "audio/aac": "audio",
  "text/plain": "text",
  "text/markdown": "text",
  "text/csv": "text",
  "application/json": "text",
};
export const ACCEPT_ATTR = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.mp3,.wav,.m4a,.ogg,.flac,.aac,.txt,.md,.csv,.json";
export const MAX_FILES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

const EXT_TYPES: Record<string, string> = {
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  txt: "text/plain",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
};

/** Browsers leave some text types blank; fall back to the extension. */
export function mediaTypeOf(file: File): string {
  if (file.type && ACCEPTED_TYPES[file.type]) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPES[ext] ?? file.type;
}

export function readAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
