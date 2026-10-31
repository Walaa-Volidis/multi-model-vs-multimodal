import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ConceptContent } from "@/content";
import { cn } from "@/lib/utils";
import { WordMark } from "./WordMark";
import { rise } from "./motion";

interface ConceptCardProps {
  content: ConceptContent;
  icon: LucideIcon;
  diagram: ReactNode;
  /** Optional rich definition (e.g. with glossary tooltips); falls back to content.definition. */
  definition?: ReactNode;
}

export function ConceptCard({ content, icon: Icon, diagram, definition }: ConceptCardProps) {
  const isModel = content.concept === "model";

  return (
    <motion.div variants={rise} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="group relative">
      {/* Accent glow behind the card; brightens on hover */}
      <div
        aria-hidden
        className={cn(
          "absolute -inset-px rounded-2xl opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-80",
          isModel ? "bg-model/25" : "bg-modal/20",
        )}
      />
      <Card
        className={cn(
          "relative h-full overflow-hidden transition-colors duration-300",
          isModel ? "group-hover:border-model/40" : "group-hover:border-modal/40",
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-xl border",
                isModel ? "border-model/30 bg-model/10 text-model-soft" : "border-modal/30 bg-modal/10 text-modal-soft",
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <Badge variant={content.concept}>{content.nickname}</Badge>
          </div>
          <CardTitle className="mt-4">
            <h2 className="text-[44px] leading-none tracking-[-0.02em]">
              <WordMark concept={content.concept} />
            </h2>
            <span className="mt-2 block font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
              usually written “{content.name}”
            </span>
          </CardTitle>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">{definition ?? content.definition}</p>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-white/[0.06] bg-background/60 p-4">{diagram}</div>
        </CardContent>

        <CardContent className="pb-7">
          <Separator className="mb-5" />
          <h3 className="mb-4 font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">In the real world</h3>
          <ul className="space-y-4">
            {content.examples.map((ex) => (
              <li key={ex.title} className="flex gap-3">
                <span aria-hidden className={cn("mt-2 size-1.5 shrink-0 rounded-full", isModel ? "bg-model" : "bg-modal")} />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">{ex.title}.</span> {ex.detail}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
