// Electron main process: one frameless-style window with a custom title bar,
// plus the live "race" against real models on OpenRouter. The API key lives only here
// (encrypted with the OS keychain via safeStorage); the UI never sees it.
const { app, BrowserWindow, shell, ipcMain, safeStorage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { runRace, checkKey } = require("./race.cjs");

// ── API key storage ───────────────────────────────────────────────────────
const keyFile = () => path.join(app.getPath("userData"), "openrouter-key.bin");

function savedKey() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(fs.readFileSync(keyFile()));
  } catch {
    return null;
  }
}

// A key saved in the app wins; OPENROUTER_API_KEY is a fallback for development.
const activeKey = () => savedKey() ?? process.env.OPENROUTER_API_KEY ?? null;

ipcMain.handle("key:status", () => ({
  hasKey: Boolean(activeKey()),
  source: savedKey() ? "saved" : process.env.OPENROUTER_API_KEY ? "env" : null,
  canEncrypt: safeStorage.isEncryptionAvailable(),
}));

ipcMain.handle("key:save", async (_e, key) => {
  const trimmed = String(key ?? "").trim();
  if (!trimmed) return { ok: false, error: "Paste an API key first." };
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: "This system can't store the key securely." };
  const check = await checkKey(trimmed);
  if (!check.ok) return check;
  fs.writeFileSync(keyFile(), safeStorage.encryptString(trimmed));
  return { ok: true };
});

ipcMain.handle("key:clear", () => {
  fs.rmSync(keyFile(), { force: true });
  return { ok: true };
});

// ── The race ──────────────────────────────────────────────────────────────
const runs = new Map(); // runId → AbortController

ipcMain.handle("race:start", (event, request) => {
  const apiKey = activeKey();
  if (!apiKey) return { ok: false, error: "Add your OpenRouter API key first." };

  // Only one race at a time per window.
  for (const controller of runs.values()) controller.abort();
  runs.clear();

  // The renderer picks the id so it can listen before the first event arrives.
  const runId = typeof request?.runId === "string" ? request.runId : crypto.randomUUID();
  const controller = new AbortController();
  runs.set(runId, controller);
  const sender = event.sender;
  const emit = (payload) => {
    if (!sender.isDestroyed()) sender.send("race:event", { runId, ...payload });
  };

  runRace(apiKey, request, emit, controller.signal).finally(() => {
    runs.delete(runId);
    emit({ type: "run-done" });
  });
  return { ok: true, runId };
});

ipcMain.handle("race:cancel", (_e, runId) => {
  runs.get(runId)?.abort();
  runs.delete(runId);
});

// `npm run electron:dev` passes --dev so the window loads the Vite dev server.
const isDev = process.argv.includes("--dev");
const isMac = process.platform === "darwin";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#09090B",
    show: false,
    // Hide the native title bar; the React <TitleBar> draws ours.
    titleBarStyle: "hidden",
    ...(isMac
      ? { trafficLightPosition: { x: 16, y: 13 } }
      : { titleBarOverlay: { color: "#09090B", symbolColor: "#A1A1AA", height: 40 } }),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  // Open external links in the system browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});
