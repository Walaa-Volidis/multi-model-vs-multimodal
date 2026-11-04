import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { runRace } from "@/engine/race";
import { clearKey, getKey, keyStatus as readKeyStatus, type KeyStatus } from "@/lib/keys";
import { emptyRace, lanesFor, raceReducer, type RaceFile, type RaceMode } from "@/lib/race";
import { cn } from "@/lib/utils";
import { rise } from "../motion";
import { Composer } from "./Composer";
import { KeySetup } from "./KeySetup";
import { LaneView } from "./LaneView";

const KEY_NOTE: Record<NonNullable<KeyStatus["source"]>, string> = {
  desktop: "OpenRouter key saved on this computer",
  env: "Using OPENROUTER_API_KEY from the environment",
  browser: "OpenRouter key remembered in this browser",
  session: "OpenRouter key kept until you close this tab",
};

/**
 * "Try it live": the visitor's files and question run through a multi-model
 * pipeline, one multimodal model, or both, with real model calls to OpenRouter
 * made straight from this page using the visitor's own key.
 */
export function TryIt() {
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [race, dispatch] = useReducer(raceReducer, emptyRace);
  const [startError, setStartError] = useState<string | null>(null);
  const [mode, setMode] = useState<RaceMode>("both");
  const controller = useRef<AbortController | null>(null);

  const refreshKey = useCallback(() => {
    readKeyStatus().then(setKeyStatus);
  }, []);

  useEffect(() => {
    refreshKey();
    return () => controller.current?.abort();
  }, [refreshKey]);

  async function run(question: string, files: RaceFile[]) {
    setStartError(null);
    const apiKey = await getKey();
    if (!apiKey) {
      setStartError("Add your OpenRouter API key first.");
      refreshKey();
      return;
    }
    controller.current?.abort(); // one run at a time
    const ac = new AbortController();
    controller.current = ac;
    const runId = crypto.randomUUID();
    dispatch({ type: "start", runId, mode });
    runRace(apiKey, { runId, mode, question, files }, (event) => dispatch({ type: "event", event }), ac.signal);
  }

  function stop() {
    controller.current?.abort();
    dispatch({ type: "stop" });
  }

  async function removeKey() {
    stop();
    await clearKey();
    refreshKey();
  }

  const hasRun = race.runId !== null;
  const shownLanes = lanesFor(race.mode);
  const multi = race.lanes.multi.stats;
  const single = race.lanes.single.stats;
  // The summary appears once every lane that ran has finished successfully.
  const allDone = hasRun && shownLanes.every((l) => race.lanes[l].stats?.ok);

  return (
    <motion.section variants={rise} id="try" aria-labelledby="try-heading" className="mt-28 scroll-mt-16">
      <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Try it live</p>
      <h2 id="try-heading" className="mt-3 font-display text-5xl tracking-[-0.02em]">
        Same question, <em className="text-foreground/70">two</em> architectures
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
        Drop in a photo, a voice note, a PDF, or some text, and ask a question. Pick multi-model to watch an AI choose
        specialist models from different companies, multimodal to watch one model handle everything, or run both side by
        side. Every step is a real model call, shown live.
      </p>

      <div className="mt-8">
        {keyStatus === null ? null : !keyStatus.hasKey ? (
          <KeySetup onSaved={refreshKey} />
        ) : (
          <>
            <Composer mode={mode} onModeChange={setMode} running={race.running} onRun={run} onStop={stop} />
            <div className="mt-2 flex justify-end gap-3 font-mono text-[11px] text-muted-foreground">
              <span>{keyStatus.source ? KEY_NOTE[keyStatus.source] : null}</span>
              {keyStatus.source !== "env" && (
                <button type="button" onClick={removeKey} className="underline underline-offset-4 hover:text-foreground">
                  Remove key
                </button>
              )}
            </div>
            {startError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {startError}
              </p>
            )}
          </>
        )}
      </div>

      {hasRun && (
        <div className={cn("mt-6 grid gap-5", shownLanes.length === 2 && "grid-cols-2 max-[900px]:grid-cols-1")}>
          {shownLanes.map((l) => (
            <LaneView key={l} lane={l} state={race.lanes[l]} running={race.running} />
          ))}
        </div>
      )}

      {allDone && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-2xl border border-white/[0.08] bg-surface-1 p-6"
        >
          <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">What just happened</p>
          <p className="mt-3 max-w-3xl leading-relaxed text-foreground/85">
            {race.mode === "multi" && multi ? (
              multi.handoffs > 0 ? (
                <>
                  Your question went through {multi.models.length} different models with {multi.handoffs} handoff
                  {multi.handoffs > 1 ? "s" : ""}. Each specialist saw only its own files; the final model saw only their notes. That's{" "}
                  <span className="text-model-soft">multi-model</span>: many brains, each doing one part. Run the same input
                  as multimodal to compare.
                </>
              ) : (
                <>
                  With no images, audio, or PDFs, there was nothing for a specialist to read, so the final model answered
                  directly. Add a photo, a voice note, or a PDF to see the work split across models.
                </>
              )
            ) : race.mode === "single" && single ? (
              <>
                One model read your question and every file in a single request, with no handoffs. That's{" "}
                <span className="text-modal-soft">multimodal</span>: one brain with many senses. Run the same input as
                multi-model to compare.
              </>
            ) : !multi || !single ? null : multi.handoffs > 0 ? (
              <>
                The <span className="text-model-soft">multi-model</span> lane used {multi.models.length} models and{" "}
                {multi.handoffs} handoff{multi.handoffs > 1 ? "s" : ""}: its final model never saw your files, only notes about
                them. The <span className="text-modal-soft">multimodal</span> lane used one model that saw everything directly.
                If the two answers differ, look for a detail the notes left out.
              </>
            ) : (
              <>
                With no images, audio, or PDFs there was nothing to hand off. Add a photo, a voice note, or a PDF to see the
                multi-model pipeline split the work.
              </>
            )}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => dispatch({ type: "reset" })}>
            Clear results
          </Button>
        </motion.div>
      )}
    </motion.section>
  );
}
