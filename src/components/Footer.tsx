import { motion } from "framer-motion";
import { rise } from "./motion";

export function Footer() {
  return (
    <motion.footer variants={rise} className="mt-28 flex flex-wrap items-baseline justify-between gap-4 border-t border-white/[0.08] py-10">
      <p className="font-display text-3xl tracking-[-0.01em]">
        <span className="text-model">Model</span> <span className="text-muted-foreground">=</span> brains.{" "}
        <span className="text-modal">Modal</span> <span className="text-muted-foreground">=</span> senses.
      </p>
      <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">Remember it by the ending</p>
    </motion.footer>
  );
}
