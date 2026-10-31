# Multimodel vs Multimodal

A dark-mode desktop app that teaches the difference between two easily confused AI ideas:

- **Multi-model**: several different AI models working together. *Many brains.*
- **Multimodal**: one model that handles several types of data. *Many senses.*

Stack: React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui (Radix), lucide-react, Framer Motion, packaged with Electron.

## Run it

Requires Node 20+.

```bash
npm install
npm run electron:dev      # Vite dev server + Electron window with hot reload
npm run dev               # same UI in a browser at http://localhost:5173
npm run electron:preview  # production build loaded in Electron
npm run electron:build    # installer in release/ (NSIS on Windows, DMG on macOS, AppImage on Linux)
npm run typecheck
```

> **Launching from a VS Code terminal?** If `ELECTRON_RUN_AS_NODE=1` is set in your shell
> (some VS Code extension hosts set it), Electron runs as plain Node and crashes with
> `Cannot read properties of undefined (reading 'whenReady')`. Clear it first:
> PowerShell `Remove-Item Env:ELECTRON_RUN_AS_NODE`, bash `unset ELECTRON_RUN_AS_NODE`.

## Try it live: real models

The "Try it live" section runs your files and question through **real models from different companies**, using one
[OpenRouter](https://openrouter.ai) key. Pick an approach and watch every step happen live:

| Approach | What happens |
|---|---|
| **Multi-model** | 1. The app detects which kinds of input you gave (text, image, audio, PDF). 2. An AI planner reads your request and picks specialists, explaining why. 3. Each specialist opens only its own files and writes notes. 4. A final model writes the answer from those notes, without seeing your files. |
| **Multimodal** | One model receives every file (images, audio, PDFs, text) and your question in a single request. |
| **Both, side by side** | Runs the two at once on the same input, so you can compare answers, time, models used, handoffs, and cost. |

The models (all in [`electron/models.cjs`](electron/models.cjs), checked against OpenRouter's live catalog on 2026-10-31):

| Role | Model | Company |
|---|---|---|
| Planner (picks specialists) | `openai/gpt-6-luna` | OpenAI |
| Vision specialist | `meta-llama/llama-4-maverick` | Meta |
| Audio specialist | `qwen/qwen3.8-omni-flash` | Qwen |
| Document (PDF) specialist | `mistralai/mistral-large-2512` | Mistral |
| Language specialist (translate, rewrite) | `cohere/command-a-plus` | Cohere |
| Final answer (multi-model) | `anthropic/claude-sonnet-5.5` | Anthropic |
| The one multimodal model | `google/gemini-3.8-flash` | Google |

To swap a model, change its id in `electron/models.cjs`. Display names and prices are read from OpenRouter's catalog at run time.

- **Inputs:** images (PNG, JPG, GIF, WebP, up to 5 MB each), audio (MP3, WAV, M4A, OGG, FLAC, AAC, up to 10 MB), PDFs, and text files (.txt, .md, .csv, .json). Up to 5 files, 20 MB in total.
- **Sample:** "Use the sample" generates a sign-ups chart and a memo that contradicts it. The data is invented.
- **API key:** create one at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) and add a few dollars of credit. The app checks the key once and stores it encrypted with the OS keychain (Electron `safeStorage`). The key stays in the main process: the UI can only save, remove, or ask whether a key exists. For development, `OPENROUTER_API_KEY` in the environment is used when no key is saved.
- **Planner safety net:** the planner's reply is checked. Unknown specialists and files a specialist can't open are dropped, and any image, audio clip, or PDF the planner forgot is assigned to the right specialist (the step says so).
- **Cost:** shown per run, from OpenRouter's reported cost or, if missing, catalog prices. A run with the sample is a few cents.

Engine: [`electron/race.cjs`](electron/race.cjs), API client: [`electron/openrouter.cjs`](electron/openrouter.cjs). IPC and key storage: [`electron/main.cjs`](electron/main.cjs). UI: [`src/components/try/`](src/components/try/).

## Project structure

```
electron/
  main.cjs            window setup, custom title bar, API key storage, race IPC
  race.cjs            the two approaches: detect → plan → specialists → final, and the single model
  openrouter.cjs      streaming chat client, model catalog, key check
  models.cjs          which real model plays each role
  preload.cjs         exposes window.desktop: platform + a narrow race/key API
src/
  main.tsx, App.tsx   entry + page composition, MotionConfig(reducedMotion="user")
  index.css           Tailwind, fonts, shadcn dark-theme CSS variables, grid + noise background
  content.ts          ALL explanatory copy (definitions, examples, table rows, glossary)
  lib/utils.ts        cn() helper
  components/
    TitleBar.tsx      custom draggable title bar
    Hero.tsx          stacked title with the "e vs a" diff column
    ConceptCard.tsx   accent card: icon, definition, diagram, 3 examples
    DifferenceDialog.tsx  the popup: Dialog + Tabs (Multi-model / Multimodal / Side by side)
    Footer.tsx        mnemonic
    WordMark.tsx      "multimodel"/"multimodal" with the -model / -modal ending coloured
    Term.tsx          glossary word with a Tooltip
    motion.ts         shared stagger/rise variants
    diagrams/
      MultiModelDiagram.tsx   task → router → three models, dots flow along routes
      MultimodalDiagram.tsx   text/image/audio/video → one model → answer
    ui/               shadcn components (button, card, badge, dialog, tabs, tooltip, separator, scroll-area)
```

## shadcn/ui

`components.json` is configured (new-york style, zinc base, CSS variables, `@/` alias). The
`src/components/ui/*` files are shadcn components restyled for this theme. To regenerate or add
more from scratch:

```bash
npx shadcn@latest init
npx shadcn@latest add button card badge dialog tabs tooltip separator scroll-area
```

(Re-adding overwrites the restyled versions; diff before accepting.)

The theme lives in `src/index.css`: the standard shadcn variables (`--background`, `--card`,
`--primary`, `--border`, …) plus two concept accents used for nothing else:
`--model` `#8B5CF6` (violet) and `--modal` `#22D3EE` (cyan). They are exposed to Tailwind as
`bg-model`, `text-modal-soft`, etc.

## Fonts

Fonts are bundled through Fontsource, so the desktop app works offline with no Google Fonts request:

```bash
npm install @fontsource/instrument-serif @fontsource-variable/geist @fontsource-variable/jetbrains-mono
```

They're imported at the top of `src/index.css` and mapped to `font-display` (Instrument Serif),
`font-sans` (Geist), and `font-mono` (JetBrains Mono).

## Accessibility and motion

- The Dialog traps focus, closes on Esc, and returns focus to the "Explain the difference" button.
  The title and description are wired to `aria-labelledby`/`aria-describedby`.
- Diagrams are `role="img"` with a text description. The hero title has an `aria-label`, so
  screen readers hear "Multimodel vs Multimodal" instead of the split letters.
- With `prefers-reduced-motion`, Framer Motion transforms are disabled and the diagram dots are
  not rendered.

## Tauri instead of Electron

Electron was used because it builds without a Rust toolchain. The UI has no Electron
dependencies apart from the optional `window.desktop` check, so you can move it to Tauri 2:

```bash
# install Rust: https://rustup.rs, then:
npm install -D @tauri-apps/cli
npx tauri init        # dev URL http://localhost:5173, dist dir ../dist, dev cmd "npm run dev", build cmd "npm run build"
```

In `src-tauri/tauri.conf.json`, set the window to `"width": 1280, "height": 800, "decorations": false`
and add `data-tauri-drag-region` to the `<header>` in `TitleBar.tsx`. Then run `npx tauri dev` / `npx tauri build`.
