import { Brain, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MNEMONIC, MULTI_MODEL, MULTIMODAL, type ConceptContent } from "@/content";
import { cn } from "@/lib/utils";
import { MultiModelDiagram } from "./diagrams/MultiModelDiagram";
import { MultimodalDiagram } from "./diagrams/MultimodalDiagram";
import { WordMark } from "./WordMark";

interface DifferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DifferenceDialog({ open, onOpenChange }: DifferenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[760px] gap-0 p-0"
        // The dialog is opened from the hero button rather than a DialogTrigger,
        // so return keyboard focus there ourselves when it closes.
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById("explain-trigger")?.focus();
        }}
      >
        <DialogHeader className="px-8 pt-8">
          <DialogTitle className="font-display text-[40px] font-normal tracking-[-0.02em]">
            What’s the <em className="text-foreground/70">difference?</em>
          </DialogTitle>
          <DialogDescription className="text-base">
            The words differ by one letter. Watch the ending:{" "}
            <WordMark concept="model" className="text-xl" /> is about models,{" "}
            <WordMark concept="modal" className="text-xl" /> is about modalities.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="model" className="mt-6">
          <TabsList className="mx-8" aria-label="Choose an explanation">
            <TabsTrigger value="model" className="data-[state=active]:text-model-soft">Multi-model</TabsTrigger>
            <TabsTrigger value="modal" className="data-[state=active]:text-modal-soft">Multimodal</TabsTrigger>
            <TabsTrigger value="both">Side by side</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[min(420px,52vh)]">
            <div className="px-8 pb-2">
              <TabsContent value="model">
                <ConceptPanel content={MULTI_MODEL} diagram={<MultiModelDiagram />} />
              </TabsContent>
              <TabsContent value="modal">
                <ConceptPanel content={MULTIMODAL} diagram={<MultimodalDiagram />} />
              </TabsContent>
              <TabsContent value="both">
                <SideBySide />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <Separator />
        <DialogFooter className="px-8 py-5">
          <DialogClose asChild>
            <Button>Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConceptPanel({ content, diagram }: { content: ConceptContent; diagram: React.ReactNode }) {
  const isModel = content.concept === "model";
  return (
    <div className="grid grid-cols-[1fr_300px] gap-8 max-[720px]:grid-cols-1">
      <div className="space-y-4 text-[15px] leading-relaxed text-foreground/85">
        <p className={cn("font-mono text-[11px] tracking-[0.1em] uppercase", isModel ? "text-model-soft" : "text-modal-soft")}>
          {content.nickname}
        </p>
        <p className="text-foreground">{content.definition}</p>
        {content.explainer.map((p) => (
          <p key={p} className="text-muted-foreground">{p}</p>
        ))}
      </div>
      <div className="self-start rounded-xl border border-white/[0.06] bg-background/60 p-4">{diagram}</div>
    </div>
  );
}

function SideBySide() {
  const items = [
    { concept: "model" as const, Icon: Brain, line: "Several models, each doing its own part.", mnemonic: MNEMONIC.model },
    { concept: "modal" as const, Icon: Eye, line: "One model, taking in several kinds of data.", mnemonic: MNEMONIC.modal },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
        {items.map(({ concept, Icon, line, mnemonic }) => (
          <div
            key={concept}
            className={cn("rounded-xl border p-5", concept === "model" ? "border-model/30 bg-model/[0.06]" : "border-modal/30 bg-modal/[0.06]")}
          >
            <WordMark concept={concept} className="text-3xl" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{line}</p>
            <p className={cn("mt-4 flex items-center gap-2 font-mono text-xs", concept === "model" ? "text-model-soft" : "text-modal-soft")}>
              <Icon className="size-4" aria-hidden />
              {mnemonic}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        <span className="text-foreground">They can overlap.</span> A multi-model system can include a multimodal model
        as one of its specialists. The two words answer different questions:{" "}
        <em className="text-model-soft not-italic">how many models?</em> versus{" "}
        <em className="text-modal-soft not-italic">how many kinds of data?</em>
      </p>
    </div>
  );
}
