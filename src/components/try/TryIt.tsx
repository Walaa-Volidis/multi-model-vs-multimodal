import { useCallback, useEffect, useReducer, useState } from "react";
import { motion } from "framer-motion";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emptyRace, lanesFor, raceReducer, type RaceFile, type RaceMode } from "@/lib/race";
import { cn } from "@/lib/utils";
import { rise } from "../motion";
import { Composer } from "./Composer";
import { KeySetup } from "./KeySetup";
import { LaneView } from "./LaneView";

type KeyStatus = Awaited<ReturnType<NonNullable<Window["desktop"]>["ai"]["keyStatus"]>>;

/**
 * "Try it live": the same files and question run through a multi-model
 * pipeline and a single multimodal model side by side, with real model calls through OpenRouter.
 */
export function TryIt() {
  const ai = window.desktop?.ai;
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [race, dispatch] = useReducer(raceReducer, emptyRace);
  const [startError, setStartError] = useState<string | null>(null);
  const [mode, setMode] = useState<RaceMode>("both");

  const refreshKey = useCallback(() => {
    ai?.keyStatus().then(setKeyStatus);
  }, [ai]);

  useEffect(() => {
    if (!ai) return;
    refreshKey();
    return ai.onRaceEvent((event) => dispatch({ type: "event", event }));
  }, [ai, refreshKey]);

  async function run(question: string, files: RaceFile[]) {
    if (!ai) return;
    setStartError(null);
    const runId = crypto.randomUUID();
    dispatch({ type: "start", runId, mode }); // before invoking, so no early event is dropped
    const result = await ai.startRace({ runId, mode, question, files });
    if (!result.ok) {
      dispatch({ type: "reset" });
      setStartError(result.error ?? "Couldn't start the race.");
    }
  }

  function stop() {
    if (race.runId) ai?.cancelRace(race.runId);
    dispatch({ type: "stop" });
  }

  async function removeKey() {
    await ai?.clearKey();
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
        {!ai ? (
          <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-surface-1 p-6">
            <Monitor className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="text-foreground">Live runs work in the desktop app.</span> Start it with{" "}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs">npm run electron:dev</code> so your API
              key stays on your computer and never touches a web page.
            </p>
          </div>
        ) : keyStatus === null ? null : !keyStatus.hasKey ? (
          <KeySetup onSaved={refreshKey} />
        ) : (
          <>
            <Composer mode={mode} onModeChange={setMode} running={race.running} onRun={run} onStop={stop} />
            <div className="mt-2 flex justify-end gap-3 font-mono text-[11px] text-muted-foreground">
              {keyStatus.source === "saved" ? (
                <>
                  <span>API key saved on this computer</span>
                  <button type="button" onClick={removeKey} className="underline underline-offset-4 hover:text-foreground">
                    Remove
                  </button>
                </>
              ) : (
                <span>Using OPENROUTER_API_KEY from the environment</span>
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
