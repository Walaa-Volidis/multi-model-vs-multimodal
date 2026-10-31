/// <reference types="vite/client" />

import type { DesktopAI } from "@/lib/race";

declare global {
  // Injected by electron/preload.cjs. Undefined when running in a plain browser.
  interface Window {
    desktop?: { platform: string; ai: DesktopAI };
  }
}
