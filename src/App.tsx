import { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Brain, Eye } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConceptCard } from "@/components/ConceptCard";
import { DifferenceDialog } from "@/components/DifferenceDialog";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Term } from "@/components/Term";
import { TitleBar } from "@/components/TitleBar";
import { TryIt } from "@/components/try/TryIt";
import { MultiModelDiagram } from "@/components/diagrams/MultiModelDiagram";
import { MultimodalDiagram } from "@/components/diagrams/MultimodalDiagram";
import { stagger } from "@/components/motion";
import { GLOSSARY, MULTI_MODEL, MULTIMODAL } from "@/content";

export default function App() {
  const [explainOpen, setExplainOpen] = useState(false);

  return (
    // reducedMotion="user" turns transform animations off when the OS asks for it.
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <div className="noise min-h-screen">
          <TitleBar />

          <main className="mx-auto max-w-[1180px] px-10 pt-10 max-sm:px-4">
            <Hero onExplain={() => setExplainOpen(true)} />

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
            >
              <section aria-label="The two concepts" className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
                <ConceptCard
                  content={MULTI_MODEL}
                  icon={Brain}
                  diagram={<MultiModelDiagram />}
                  definition={
                    <>
                      A system that uses several different AI models together. A{" "}
                      <Term definition={GLOSSARY.router}>router</Term> or pipeline gives each model the part of the job
                      it does best.
                    </>
                  }
                />
                <ConceptCard
                  content={MULTIMODAL}
                  icon={Eye}
                  diagram={<MultimodalDiagram />}
                  definition={
                    <>
                      A single AI model that can understand, and sometimes produce, more than one{" "}
                      <Term definition={GLOSSARY.modality}>modality</Term>: text, images, audio, or video.
                    </>
                  }
                />
              </section>

              <TryIt />
              <Footer />
            </motion.div>
          </main>

          <DifferenceDialog open={explainOpen} onOpenChange={setExplainOpen} />
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
