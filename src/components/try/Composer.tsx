import { useRef, useState, type ReactNode } from "react";
import { AudioLines, FileText, Image as ImageIcon, Loader2, Play, Sparkles, Square, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_TYPES,
  ACCEPT_ATTR,
  MAX_FILES,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  MAX_TOTAL_BYTES,
  formatBytes,
  mediaTypeOf,
  readAsBase64,
  type RaceFile,
  type RaceMode,
} from "@/lib/race";
import { loadSample } from "@/lib/sample";
import { cn } from "@/lib/utils";
import { WordMark } from "../WordMark";

interface ComposerProps {
  mode: RaceMode;
  onModeChange: (mode: RaceMode) => void;
  running: boolean;
  onRun: (question: string, files: RaceFile[]) => void;
  onStop: () => void;
}

const MODES: { value: RaceMode; label: ReactNode; hint: string; run: string }[] = [
  {
    value: "multi",
    label: <WordMark concept="model" />,
    hint: "An AI picks specialists from different companies",
    run: "Run multi-model",
  },
  {
    value: "single",
    label: <WordMark concept="modal" />,
    hint: "One model sees, hears, and reads it all",
    run: "Run multimodal",
  },
  {
    value: "both",
    label: (
      <span className="font-display">
        <span className="text-foreground">both</span> <span className="text-muted-foreground italic">side by side</span>
      </span>
    ),
    hint: "Race them on the same input",
    run: "Start the race",
  },
];

export function Composer({ mode, onModeChange, running, onRun, onStop }: ComposerProps) {
  const [files, setFiles] = useState<RaceFile[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(list: FileList | File[]) {
    setError(null);
    const incoming = Array.from(list);
    const next = [...files];
    for (const file of incoming) {
      const mediaType = mediaTypeOf(file);
      if (!ACCEPTED_TYPES[mediaType]) {
        setError(`${file.name} isn't supported. Use images, audio (MP3, WAV, M4A, OGG, FLAC), PDFs, or text files.`);
        continue;
      }
      if (mediaType.startsWith("image/") && file.size > MAX_IMAGE_BYTES) {
        setError(`${file.name} is over 5 MB. Use a smaller image.`);
        continue;
      }
      if (mediaType.startsWith("audio/") && file.size > MAX_AUDIO_BYTES) {
        setError(`${file.name} is over 10 MB. Use a shorter clip.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setError(`You can add up to ${MAX_FILES} files.`);
        break;
      }
      next.push({ name: file.name, mediaType, size: file.size, data: await readAsBase64(file) });
    }
    if (next.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) {
      setError("These files add up to more than 20 MB. Remove one and try again.");
      return;
    }
    setFiles(next);
  }

  async function useSample() {
    setLoadingSample(true);
    const sample = await loadSample();
    setFiles(sample.files);
    setQuestion(sample.question);
    setError(null);
    setLoadingSample(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (running) return onStop();
    if (!question.trim()) return setError("Write a question for the models to answer.");
    onRun(question.trim(), files);
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/[0.08] bg-surface-1 p-6">
      {/* Approach picker — a radio group so arrow keys move between options */}
      <p id="mode-label" className="mb-2 font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
        1 · Choose an approach
      </p>
      <div
        role="radiogroup"
        aria-labelledby="mode-label"
        className="mb-6 grid grid-cols-3 gap-3 max-[700px]:grid-cols-1"
        onKeyDown={(e) => {
          if (running || !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
          e.preventDefault();
          const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
          // Move from the focused option, not `mode`, so fast repeated presses don't read a stale value.
          const options = Array.from(e.currentTarget.children) as HTMLElement[];
          const current = options.indexOf(document.activeElement as HTMLElement);
          const i = ((current < 0 ? 0 : current) + step + options.length) % options.length;
          onModeChange(MODES[i].value);
          options[i].focus();
        }}
      >
        {MODES.map((m) => {
          const checked = m.value === mode;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              disabled={running}
              onClick={() => onModeChange(m.value)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-60",
                checked
                  ? m.value === "multi"
                    ? "border-model/50 bg-model/[0.08]"
                    : m.value === "single"
                      ? "border-modal/50 bg-modal/[0.08]"
                      : "border-white/30 bg-white/[0.05]"
                  : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]",
              )}
            >
              <span className="block text-2xl leading-tight">{m.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{m.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 max-[900px]:grid-cols-1">
        {/* Files */}
        <div>
          <p className="mb-2 font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">2 · Your files</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            disabled={running}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50",
              dragging ? "border-modal/60 bg-modal/[0.06]" : "border-white/15 hover:border-white/25 hover:bg-white/[0.02]",
            )}
          >
            <Upload className="size-5 text-muted-foreground" aria-hidden />
            <span className="text-sm">Drop files or click to add</span>
            <span className="text-xs text-muted-foreground">Images, audio, PDFs, or text · up to {MAX_FILES}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5" aria-label="Attached files">
              {files.map((f, i) => (
                <li key={f.name + i} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                  {f.mediaType.startsWith("image/") ? (
                    <ImageIcon className="size-4 shrink-0 text-modal-soft" aria-hidden />
                  ) : f.mediaType.startsWith("audio/") ? (
                    <AudioLines className="size-4 shrink-0 text-modal-soft" aria-hidden />
                  ) : (
                    <FileText className="size-4 shrink-0 text-modal-soft" aria-hidden />
                  )}
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">{formatBytes(f.size)}</span>
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    aria-label={`Remove ${f.name}`}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Question */}
        <div className="flex flex-col">
          <label htmlFor="race-question" className="mb-2 font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            3 · Your question
          </label>
          <textarea
            id="race-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={running}
            rows={4}
            placeholder="e.g. What's the most important thing in these files, and does anything contradict itself?"
            className="min-h-28 flex-1 resize-none rounded-xl border border-white/10 bg-background px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={useSample} disabled={running || loadingSample}>
              {loadingSample ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              Use the sample (chart + memo)
            </Button>
            <Button type="submit" className={cn(!running && "shadow-[0_0_32px_-8px_rgb(34_211_238/0.6)]")}>
              {running ? <Square className="size-3.5 fill-current" aria-hidden /> : <Play className="size-3.5 fill-current" aria-hidden />}
              {running ? "Stop" : MODES.find((m) => m.value === mode)!.run}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
