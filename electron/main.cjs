// Electron main process: one window with a custom title bar, plus encrypted
// storage for the OpenRouter key (OS keychain via safeStorage). The page itself
// runs the models (src/engine), exactly as it does on the website.
const { app, BrowserWindow, shell, ipcMain, safeStorage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

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
}));

ipcMain.handle("key:get", () => activeKey());

// The page has already checked the key with OpenRouter before saving it.
ipcMain.handle("key:save", (_e, key) => {
  const trimmed = String(key ?? "").trim();
  if (!trimmed) return { ok: false, error: "Paste an API key first." };
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: "This system can't store the key securely." };
  fs.writeFileSync(keyFile(), safeStorage.encryptString(trimmed));
  return { ok: true };
});

ipcMain.handle("key:clear", () => {
  fs.rmSync(keyFile(), { force: true });
  return { ok: true };
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
