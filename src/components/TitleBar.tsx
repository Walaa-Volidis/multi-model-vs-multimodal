import { cn } from "@/lib/utils";

/**
 * Custom title bar. The whole strip is an Electron drag region; on Windows and
 * Linux the native window buttons are overlaid on the right, on macOS the
 * traffic lights sit on the left, so we pad accordingly.
 */
export function TitleBar() {
  const platform = window.desktop?.platform;
  const isMac = platform === "darwin";

  return (
    <header
      className={cn(
        "app-drag fixed inset-x-0 top-0 z-40 flex h-10 items-center border-b border-white/[0.06] bg-background/80 backdrop-blur-md",
        isMac ? "pl-20" : "pl-4",
        platform && !isMac ? "pr-[140px]" : "pr-4",
      )}
    >
      <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-wide text-muted-foreground">
        <span aria-hidden className="flex gap-1">
          <span className="size-2 rounded-full bg-model" />
          <span className="size-2 rounded-full bg-modal" />
        </span>
        Multimodel vs Multimodal
      </div>
    </header>
  );
}
