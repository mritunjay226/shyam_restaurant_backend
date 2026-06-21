const { app, BrowserWindow, shell, Menu, ipcMain } = require("electron");
const path = require("path");

// Disable GPU Hardware Acceleration for maximum compatibility on lower-end retail/POS terminals
app.disableHardwareAcceleration();

const VERCEL_URL = "https://shyam-restaurant-backend.vercel.app";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, "assets", "icon.png"),
    title: "Shyam Hotel",
    frame: false,          // removes native Windows titlebar
    titleBarStyle: "hidden",
    backgroundColor: "#111827",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadURL(VERCEL_URL);

  // Connection error handling (prevents infinite black screen hanging when offline or cold-starting)
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL === VERCEL_URL) {
      mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`
        <html>
        <head>
          <title>Connection Error</title>
          <style>
            body {
              background-color: #111827;
              color: #F3F4F6;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            h1 { font-size: 24px; margin-bottom: 8px; font-weight: 800; }
            p { font-size: 14px; color: #9CA3AF; margin-bottom: 24px; max-width: 320px; line-height: 1.5; }
            button {
              background-color: #3B82F6;
              color: white;
              border: none;
              padding: 10px 20px;
              font-size: 14px;
              font-weight: 600;
              border-radius: 8px;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            button:hover { background-color: #2563EB; }
          </style>
        </head>
        <body>
          <h1>Connection Error</h1>
          <p>Unable to connect to Shyam Hotel Server. Please check your internet connection and click retry.</p>
          <button onclick="window.location.reload()">Retry Connection</button>
        </body>
        </html>
      `));
    }
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(VERCEL_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Notify renderer when maximize state changes
  mainWindow.on("maximize",   () => mainWindow.webContents.send("win-maximized", true));
  mainWindow.on("unmaximize", () => mainWindow.webContents.send("win-maximized", false));

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── IPC: window controls ─────────────────────────────────────────────────────
ipcMain.on("win-minimize", () => mainWindow?.minimize());
ipcMain.on("win-maximize", () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.on("win-close",  () => mainWindow?.close());
ipcMain.on("win-reload", () => mainWindow?.loadURL(VERCEL_URL));
ipcMain.handle("win-is-maximized", () => mainWindow?.isMaximized() ?? false);

// ── IPC: printing ─────────────────────────────────────────────────────────────
ipcMain.handle("print-receipt", async (_event, { html, thermal }) => {
  return new Promise((resolve, reject) => {
    const silent = !!thermal; // Thermal receipts print silently, A4 shows print dialog

    const printWin = new BrowserWindow({
      show: !silent, // Only show window if printing interactively (non-silent)
      width: 800,
      height: 600,
      parent: mainWindow || undefined,
      modal: !silent, // Modal to parent window if visible
      title: "Print Receipt",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Use a data URI so no network request is needed
    printWin.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html)
    );

    printWin.webContents.once("did-finish-load", () => {
      // Small timeout to ensure renderer is fully prepared
      setTimeout(() => {
        if (printWin.isDestroyed()) {
          reject(new Error("print-window-destroyed"));
          return;
        }

        printWin.webContents.print(
          {
            silent: silent,
            printBackground: true,
          },
          (success, errorType) => {
            if (!printWin.isDestroyed()) {
              printWin.close();
            }
            if (success) resolve(true);
            else reject(new Error(errorType ?? "print-failed"));
          }
        );
      }, 100);
    });

    // Safety net: if the window fails to load, close and reject
    printWin.webContents.once("did-fail-load", (_e, code, desc) => {
      if (!printWin.isDestroyed()) {
        printWin.close();
      }
      reject(new Error(`did-fail-load: ${code} ${desc}`));
    });
  });
});

// Remove default menu bar
Menu.setApplicationMenu(null);

// ── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});