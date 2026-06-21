# Shyam Hotel — Desktop App

Electron wrapper around the Vercel-deployed Next.js app.

## Setup

```bash
npm install
```

## 1. Set your Vercel URL

Open `main.js` and replace the placeholder on line 3:

```js
const VERCEL_URL = "https://your-app.vercel.app"; // 🔁 change this
```

## 2. Add an app icon

Put your icon files in the `assets/` folder:

| File | Used for |
|------|----------|
| `assets/icon.png` | Linux + loading |
| `assets/icon.ico` | Windows |
| `assets/icon.icns` | macOS |

> **Tip:** Use https://www.icoconverter.com to convert a PNG → ICO, and
> https://cloudconvert.com/png-to-icns for ICNS. A 512×512 PNG works well as the base.

## 3. Run in development

```bash
npm start
```

## 4. Build installers

```bash
# Windows (.exe installer)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (.AppImage + .deb)
npm run build:linux
```

Built files land in the `dist/` folder.

## File structure

```
hotel-desktop/
├── main.js          ← Electron entry point
├── package.json     ← Build config (electron-builder)
├── assets/
│   ├── icon.png
│   ├── icon.ico
│   └── icon.icns
└── dist/            ← Generated installers (after build)
```

## Notes

- The app requires internet — it loads your live Vercel deployment
- External links (e.g. payment gateways) automatically open in the system browser
- Dev tools are accessible via View menu or `Ctrl+Shift+I` / `Cmd+Option+I`