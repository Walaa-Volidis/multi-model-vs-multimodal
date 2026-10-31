import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Lane, LaneState, LaneStats, StepState } from "@/lib/race";
import { cn } from "@/lib/utils";
import { WordMark } from "../WordMark";

const LANE_COPY: Record<Lane, { concept: "model" | "modal"; caption: string }> = {
  multi: { concept: "model", caption: "An AI planner picks specialists from different companies; a final model combines their work" },
  single: { concept: "modal", caption: "One model receives every file (images, audio, PDFs, text) in a single request" },
};

export function LaneView({ lane, state, running }: { lane: Lane; state: LaneState; running: boolean }) {
  const { concept, caption } = LANE_COPY[lane];
  const isModel = concept === "model";

  return (
    <section
      aria-label={isModel ? "Multi-model lane" : "Multimodal lane"}
      aria-busy={running && !state.stats}
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border bg-surface-1 p-5",
        isModel ? "border-model/25" : "border-modal/25",
      )}
    >
      <header className="mb-4">
        <WordMark concept={concept} className="text-3xl" />
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </header>

      <ol className="flex flex-col gap-2.5" aria-live="polite">
        <AnimatePresence initial={false}>
          {state.steps.map((step) => (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <StepCard step={step} concept={concept} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      {state.stats && <LaneStatsRow stats={state.stats} isModel={isModel} />}
    </section>
  );
}

function LaneStatsRow({ stats: s, isModel }: { stats: LaneStats; isModel: boolean }) {
  return (
    <dl
      className={cn(
        "mt-4 grid grid-cols-4 gap-2 rounded-xl border p-3 font-mono text-[11px]",
        isModel ? "border-model/20 bg-model/[0.05]" : "border-modal/20 bg-modal/[0.05]",
      )}
    >
      <Stat label="time" value={`${(s.ms / 1000).toFixed(1)}s`} />
      <Stat label="models" value={String(s.models.length)} />
      <Stat label="handoffs" value={String(s.handoffs)} />
      <Stat label="est. cost" value={s.costUsd < 0.01 ? "<$0.01" : `$${s.costUsd.toFixed(3)}`} />
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="tracking-[0.08em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function StepCard({ step, concept }: { step: StepState; concept: "model" | "modal" }) {
  const isFinal = step.role === "final";
  return (
    <div className="rounded-xl border border-white/[0.07] bg-background/60 p-3.5">
      <div className="flex items-start gap-2.5">
        <StatusIcon status={step.status} concept={concept} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-medium">{step.title}</p>
            {step.modelLabel && <Badge variant={step.role === "detect" ? "default" : concept}>{step.modelLabel}</Badge>}
            {step.ms !== undefined && step.ms > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground">{(step.ms / 1000).toFixed(1)}s</span>
            )}
          </div>
          {step.detail && <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>}
        </div>
      </div>

      {(step.text || step.status === "running") && (
        <div
          className={cn(
            "mt-3 max-h-60 overflow-y-auto rounded-lg border border-white/[0.05] bg-surface-1 px-3 py-2.5 whitespace-pre-wrap",
            isFinal ? "text-sm leading-relaxed text-foreground/90" : "font-mono text-[11.5px] leading-relaxed text-muted-foreground",
          )}
        >
          {step.text || <span className="text-muted-foreground/60">Waiting for the first words…</span>}
        </div>
      )}

      {step.error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {step.error}
        </p>
      )}
    </div>
  );
}

function StatusIcon({ status, concept }: { status: StepState["status"]; concept: "model" | "modal" }) {
  const tone = concept === "model" ? "text-model-soft" : "text-modal-soft";
  if (status === "running") return <Loader2 className={cn("mt-0.5 size-4 shrink-0 animate-spin", tone)} aria-label="Running" />;
  if (status === "error") return <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Failed" />;
  return <Check className={cn("mt-0.5 size-4 shrink-0", tone)} aria-label="Done" />;
}
