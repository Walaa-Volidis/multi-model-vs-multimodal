import { useReducedMotion } from "framer-motion";
import { AudioLines, Image, Type, Video, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Four kinds of data flow into one model, which produces one answer.
const INPUTS: { label: string; Icon: LucideIcon; y: number }[] = [
  { label: "text", Icon: Type, y: 27 },
  { label: "image", Icon: Image, y: 69 },
  { label: "audio", Icon: AudioLines, y: 111 },
  { label: "video", Icon: Video, y: 153 },
];
const MODEL = { cx: 206, cy: 90 };
const inputPath = (y: number) => `M 48 ${y} C 120 ${y}, 130 ${MODEL.cy}, ${MODEL.cx - 32} ${MODEL.cy}`;
const OUTPUT = `M ${MODEL.cx + 32} ${MODEL.cy} L 282 ${MODEL.cy}`;

export function MultimodalDiagram({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 340 180"
      role="img"
      aria-label="Diagram: text, an image, audio, and video all flow into one single model, which produces one answer."
      className={cn("w-full font-mono", className)}
    >
      <g fill="none" stroke="var(--modal)" strokeOpacity="0.35" strokeWidth="1.25">
        {INPUTS.map((i) => (
          <path key={i.label} d={inputPath(i.y)} />
        ))}
        <path d={OUTPUT} />
      </g>

      {!reduce && (
        <g fill="var(--modal-soft)">
          {INPUTS.map((i, n) => (
            <circle key={i.label} r="2.5">
              <animateMotion dur="2.4s" begin={`${n * 0.6}s`} repeatCount="indefinite" path={inputPath(i.y)} />
            </circle>
          ))}
          <circle r="2.5">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={OUTPUT} />
          </circle>
        </g>
      )}

      {/* Input modalities */}
      {INPUTS.map(({ label, Icon, y }) => (
        <g key={label}>
          <rect x="8" y={y - 17} width="40" height="34" rx="10" fill="var(--surface-2)" stroke="rgb(255 255 255 / 0.12)" />
          <Icon x="19" y={y - 9} width="18" height="18" color="var(--modal-soft)" strokeWidth={1.6} aria-hidden />
          <text x="56" y={y - 9} fontSize="8.5" fill="var(--muted-foreground)">{label}</text>
        </g>
      ))}

      {/* The one model */}
      <circle cx={MODEL.cx} cy={MODEL.cy} r="40" fill="var(--modal)" fillOpacity="0.06" />
      <circle cx={MODEL.cx} cy={MODEL.cy} r="32" fill="color-mix(in srgb, var(--modal) 12%, var(--surface-2))" stroke="var(--modal)" strokeOpacity="0.8" />
      <text x={MODEL.cx} y={MODEL.cy - 2} textAnchor="middle" fontSize="10" fill="var(--modal-soft)">one</text>
      <text x={MODEL.cx} y={MODEL.cy + 11} textAnchor="middle" fontSize="10" fill="var(--modal-soft)">model</text>

      {/* Answer */}
      <rect x="282" y={MODEL.cy - 14} width="52" height="28" rx="14" fill="var(--surface-2)" stroke="rgb(255 255 255 / 0.12)" />
      <text x="308" y={MODEL.cy + 3.5} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">answer</text>
    </svg>
  );
}
