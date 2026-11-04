// The only bridge between the page and the main process: the OS (for title-bar
// padding) and the encrypted OpenRouter key store. The page runs the models.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  ai: {
    keyStatus: () => ipcRenderer.invoke("key:status"),
    getKey: () => ipcRenderer.invoke("key:get"),
    saveKey: (key) => ipcRenderer.invoke("key:save", key),
    clearKey: () => ipcRenderer.invoke("key:clear"),
  },
});
