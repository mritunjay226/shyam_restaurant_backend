/**
 * printReceipt — universal print helper.
 *
 * • In Electron  → uses IPC so main process opens a hidden BrowserWindow and
 *                  calls webContents.print() — works with any printer, no popup.
 * • In browser   → falls back to a hidden <iframe> (works in Chrome dev mode).
 */
export async function printReceipt(html: string, thermal: boolean): Promise<void> {
  const pageCSS = thermal
    ? `@page { size: 80mm auto; margin: 0; }`
    : `@page { size: A4; margin: 0; }`;

  const bodyCSS = thermal
    ? `
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 11px;
        line-height: 1.5;
        color: #000;
        background: #fff;
        padding: 5mm 4mm;
        width: 80mm;
        margin: 0;
      }
      .thermal-solid-divider  { border: none; border-top: 1px solid #000;  margin: 5px 0; display: block; }
      .thermal-dashed-divider { border: none; border-top: 1px dashed #000; margin: 4px 0; display: block; }
      .thermal-center { text-align: center; }
      .thermal-right  { text-align: right;  }
      .thermal-total-row { font-size: 14px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { padding: 1px 2px; }
    `
    : `
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        color: #000;
        background: #fff;
        margin: 0;
        padding: 0;
        width: 210mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      img   { display: block; max-width: 100%; }
      table { border-collapse: collapse; }
    `;

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print</title>
  <style>
    ${pageCSS}
    * { box-sizing: border-box; }
    ${bodyCSS}
  </style>
</head>
<body>${html}</body>
</html>`;

  // ── Electron path ────────────────────────────────────────────────────────────
  const api = (window as any).electronAPI;
  if (api?.print) {
    await api.print(fullHtml, thermal);
    return;
  }

  // ── Browser fallback (iframe) ────────────────────────────────────────────────
  const existing = document.getElementById("__print_frame__");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "__print_frame__";
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(fullHtml);
  doc.close();

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
          resolve();
        }, 1000);
      }
    }, 350);
  });
}
