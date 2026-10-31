import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rise, stagger } from "./motion";

/**
 * The two words are stacked so their shared "Multimod" lines up exactly, which
 * puts the only letters that differ (e and a) in the same column. That column
 * is highlighted and reads, top to bottom, "e vs a".
 */
export function Hero({ onExplain }: { onExplain: () => void }) {
  return (
    <motion.section variants={stagger} initial="hidden" animate="show" className="pt-20 pb-24">
      <motion.p variants={rise} className="mb-8 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
        Two AI terms people mix up
      </motion.p>

      <motion.h1 variants={rise} aria-label="Multimodel vs Multimodal" className="font-display font-normal">
        <span
          aria-hidden
          className="grid w-fit grid-cols-[auto_auto_auto_1fr] items-baseline text-[clamp(64px,10.5vw,148px)] leading-[0.92] tracking-[-0.035em]"
        >
          {/* Every cell is placed explicitly so the diff column can overlap them. */}
          {/* Row 1 — multimodel */}
          <span className="col-start-1 row-start-1">Multimod</span>
          <span className="relative z-10 col-start-2 row-start-1 px-[0.06em] text-model">e</span>
          <span className="col-start-3 row-start-1">l</span>
          <span className="col-start-4 row-start-1 self-center pl-8 font-mono text-xs leading-snug tracking-normal text-model-soft">
            → many models
          </span>

          {/* Row 2 — the "vs", sitting inside the diff column */}
          <span className="relative z-10 col-start-2 row-start-2 py-1 text-center text-[0.32em] leading-none text-muted-foreground italic">
            vs
          </span>

          {/* Row 3 — multimodal */}
          <span className="col-start-1 row-start-3">Multimod</span>
          <span className="relative z-10 col-start-2 row-start-3 px-[0.06em] text-modal">a</span>
          <span className="col-start-3 row-start-3">l</span>
          <span className="col-start-4 row-start-3 self-center pl-8 font-mono text-xs leading-snug tracking-normal text-modal-soft">
            → many modalities
          </span>

          {/* The diff column: spans all three rows behind the e / vs / a letters */}
          <motion.span
            className="pointer-events-none col-start-2 row-span-3 row-start-1 self-stretch -my-[0.06em] rounded-[0.12em] border border-white/10 bg-[linear-gradient(180deg,rgb(139_92_246/0.18),rgb(34_211_238/0.16))]"
            initial={{ opacity: 0, scaleY: 0.6 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
      </motion.h1>

      <motion.div variants={rise} className="mt-12 flex flex-wrap items-end justify-between gap-8">
        <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
          <span className="text-foreground">One letter apart. Completely different ideas.</span> One is about using
          many AI models, the other is about one model handling many kinds of data.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="lg" asChild>
            <a href="#try">Try it live</a>
          </Button>
          <Button id="explain-trigger" size="lg" onClick={onExplain} className="group shadow-[0_0_40px_-8px_rgb(139_92_246/0.6)]">
            Explain the difference
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </motion.div>
    </motion.section>
  );
}
