import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// One task enters a router, which fans out to three different models.
const ROUTES = [
  { d: "M 150 90 C 196 90, 200 38, 238 38", label: "code model", y: 38 },
  { d: "M 150 90 L 238 90", label: "writing model", y: 90 },
  { d: "M 150 90 C 196 90, 200 142, 238 142", label: "math model", y: 142 },
];
const INTAKE = "M 66 90 L 114 90";

export function MultiModelDiagram({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 340 180"
      role="img"
      aria-label="Diagram: a task goes into a router, which sends it to one of three different models: a code model, a writing model, or a math model."
      className={cn("w-full font-mono", className)}
    >
      {/* Connection lines */}
      <g fill="none" stroke="var(--model)" strokeOpacity="0.35" strokeWidth="1.25">
        <path d={INTAKE} />
        {ROUTES.map((r) => (
          <path key={r.label} d={r.d} />
        ))}
      </g>

      {/* Flowing dots — skipped entirely when the user prefers reduced motion */}
      {!reduce && (
        <g fill="var(--model-soft)">
          <circle r="2.5">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={INTAKE} />
          </circle>
          {/* The router picks one model at a time: each route's dot travels
              for the first third of a 3.6s cycle, then hides. */}
          {ROUTES.map((r, i) => (
            <circle key={r.label} r="2.5" opacity="0">
              <animateMotion dur="3.6s" begin={`${i * 1.2}s`} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.33;1" calcMode="linear" path={r.d} />
              <animate attributeName="opacity" dur="3.6s" begin={`${i * 1.2}s`} repeatCount="indefinite" values="1;1;0;0" keyTimes="0;0.33;0.34;1" />
            </circle>
          ))}
        </g>
      )}

      {/* Task */}
      <rect x="6" y="76" width="60" height="28" rx="14" fill="var(--surface-2)" stroke="rgb(255 255 255 / 0.12)" />
      <text x="36" y="94" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">task</text>

      {/* Router */}
      <circle cx="132" cy="90" r="18" fill="var(--surface-2)" stroke="var(--model)" strokeOpacity="0.8" />
      <path d="M 124 90 h 16 M 134 84 l 6 6 l -6 6" fill="none" stroke="var(--model-soft)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="132" y="126" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">router</text>

      {/* Models */}
      {ROUTES.map((r) => (
        <g key={r.label}>
          <rect x="238" y={r.y - 15} width="96" height="30" rx="9" fill="color-mix(in srgb, var(--model) 12%, var(--surface-2))" stroke="var(--model)" strokeOpacity="0.55" />
          <text x="286" y={r.y + 3.5} textAnchor="middle" fontSize="10" fill="var(--model-soft)">{r.label}</text>
        </g>
      ))}
    </svg>
  );
}
