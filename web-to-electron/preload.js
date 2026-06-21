const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize:      () => ipcRenderer.send("win-minimize"),
  maximize:      () => ipcRenderer.send("win-maximize"),
  close:         () => ipcRenderer.send("win-close"),
  reload:        () => ipcRenderer.send("win-reload"),
  isMaximized:   () => ipcRenderer.invoke("win-is-maximized"),
  onMaximized:   (cb) => ipcRenderer.on("win-maximized", (_e, val) => cb(val)),
  // Printing — delegates to main process which opens a hidden BrowserWindow
  print:         (html, thermal) => ipcRenderer.invoke("print-receipt", { html, thermal }),
});
