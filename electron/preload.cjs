// The only bridge between the UI and the main process. Exposes the OS (for
// title-bar padding) and a narrow API for the live race. No key ever crosses
// back to the renderer: it can save or clear one, and ask whether one exists.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  ai: {
    keyStatus: () => ipcRenderer.invoke("key:status"),
    saveKey: (key) => ipcRenderer.invoke("key:save", key),
    clearKey: () => ipcRenderer.invoke("key:clear"),
    startRace: (request) => ipcRenderer.invoke("race:start", request),
    cancelRace: (runId) => ipcRenderer.invoke("race:cancel", runId),
    onRaceEvent: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("race:event", listener);
      return () => ipcRenderer.removeListener("race:event", listener);
    },
  },
});
