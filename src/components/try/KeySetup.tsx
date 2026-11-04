import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isDesktop, saveKey } from "@/lib/keys";

/** First-run panel: paste an OpenRouter API key, which is checked with OpenRouter and then stored. */
export function KeySetup({ onSaved }: { onSaved: () => void }) {
  const desktop = isDesktop();
  const [key, setKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveKey(key, remember);
    setSaving(false);
    if (result.ok) onSaved();
    else setError(result.error ?? "Couldn't save the key.");
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-surface-1 p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <KeyRound className="size-5 text-muted-foreground" aria-hidden />
        </span>
        <h3 className="font-display text-3xl">Connect to real models</h3>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        One OpenRouter key reaches real models from Meta, Google, Mistral, Cohere, Qwen, OpenAI, and Anthropic. Runs are
        billed to your OpenRouter account, usually a few cents each.{" "}
        {desktop
          ? "Your key is checked once, then stored encrypted by your operating system on this computer only."
          : "Your key stays in this browser and is sent only to OpenRouter, never to this site's server."}
      </p>
      <label htmlFor="api-key" className="mt-6 block font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
        OpenRouter API key
      </label>
      <input
        id="api-key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="sk-or-v1-…"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "api-key-error" : undefined}
        className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-background px-4 font-mono text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      />
      {error && (
        <p id="api-key-error" role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {!desktop && (
        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 accent-[var(--modal)]"
          />
          Remember on this device (otherwise it's forgotten when you close the tab)
        </label>
      )}
      <div className="mt-6 flex items-center justify-between gap-4">
        <a
          href="https://openrouter.ai/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Get an OpenRouter key
        </a>
        <Button type="submit" disabled={saving || !key.trim()}>
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          {saving ? "Checking key…" : "Save key"}
        </Button>
      </div>
    </form>
  );
}
