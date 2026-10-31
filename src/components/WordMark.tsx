import type { Concept } from "@/content";
import { cn } from "@/lib/utils";

/**
 * "multimodel" / "multimodal" with the concept half in its accent colour and
 * the one letter that differs (e vs a) underlined.
 */
export function WordMark({ concept, className }: { concept: Concept; className?: string }) {
  const isModel = concept === "model";
  return (
    <span className={cn("font-display", className)}>
      <span className="text-foreground/55">multi</span>
      <span className={isModel ? "text-model" : "text-modal"}>
        mod
        <span className="underline decoration-[0.06em] underline-offset-[0.14em]">{isModel ? "e" : "a"}</span>l
      </span>
    </span>
  );
}
