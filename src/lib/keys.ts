// Where the visitor's OpenRouter key lives.
//   Desktop: encrypted by the OS keychain in the Electron main process.
//   Web:     in this browser only — localStorage if they choose "remember",
//            otherwise sessionStorage (gone when the tab closes).
// The key is only ever sent to OpenRouter.

import { checkKey } from "@/engine/openrouter";

export type KeySource = "desktop" | "env" | "browser" | "session";
export interface KeyStatus {
  hasKey: boolean;
  source: KeySource | null;
}

const STORAGE_KEY = "openrouter-api-key";
const desktop = () => window.desktop?.ai;
export const isDesktop = () => Boolean(desktop());

function read(storage: () => Storage): string | null {
  try {
    return storage().getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode, disabled site data)
  }
}

function write(storage: () => Storage, value: string | null) {
  try {
    if (value === null) storage().removeItem(STORAGE_KEY);
    else storage().setItem(STORAGE_KEY, value);
  } catch {
    /* storage blocked; the key just won't persist */
  }
}

// Fallback if both storages are blocked: keep it for this page view only.
let memoryKey: string | null = null;

export async function keyStatus(): Promise<KeyStatus> {
  const d = desktop();
  if (d) {
    const s = await d.keyStatus();
    return { hasKey: s.hasKey, source: s.source === "saved" ? "desktop" : s.source };
  }
  if (read(() => localStorage)) return { hasKey: true, source: "browser" };
  if (read(() => sessionStorage) ?? memoryKey) return { hasKey: true, source: "session" };
  return { hasKey: false, source: null };
}

export async function getKey(): Promise<string | null> {
  const d = desktop();
  if (d) return d.getKey();
  return read(() => localStorage) ?? read(() => sessionStorage) ?? memoryKey;
}

/** Checks the key against OpenRouter, then stores it. */
export async function saveKey(key: string, remember: boolean): Promise<{ ok: boolean; error?: string }> {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, error: "Paste an API key first." };
  const check = await checkKey(trimmed);
  if (!check.ok) return check;

  const d = desktop();
  if (d) return d.saveKey(trimmed);
  memoryKey = trimmed;
  write(() => localStorage, remember ? trimmed : null);
  write(() => sessionStorage, remember ? null : trimmed);
  return { ok: true };
}

export async function clearKey(): Promise<void> {
  const d = desktop();
  if (d) {
    await d.clearKey();
    return;
  }
  memoryKey = null;
  write(() => localStorage, null);
  write(() => sessionStorage, null);
}
