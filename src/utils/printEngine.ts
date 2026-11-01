export type PrintPaperMode = 'thermal80' | 'thermal58' | 'tax_invoice' | 'a4_report';

const DYNAMIC_PAGE_STYLE_ID = 'vyapar-dynamic-page-style';
const PRINT_IFRAME_ID = 'vyapar-clean-print-iframe';

/**
 * Returns @page and print container CSS tailored to the exact physical paper format:
 * - thermal80 : 80mm POS thermal roll (72mm safe printable width, zero margins)
 * - thermal58 : 54mm minimum / 58mm 2-inch mini thermal roll (48mm safe printable width, zero margins)
 * - tax_invoice : A4 portrait formal GST Tax Invoice (8mm page margin, multi-page table repeat)
 * - a4_report : A4 portrait consolidated sales & GST register report (10mm page margin)
 */
export function buildFormatPrintCss(mode: PrintPaperMode): string {
  const pageRule =
    mode === 'thermal80'
      ? `@page { size: 80mm auto; margin: 0mm; }`
      : mode === 'thermal58'
      ? `@page { size: 54mm auto; margin: 0mm; }`
      : mode === 'tax_invoice'
      ? `@page { size: A4 portrait; margin: 8mm; }`
      : `@page { size: A4 portrait; margin: 10mm; }`;

  const containerRule =
    mode === 'thermal80'
      ? `
        html, body {
          width: 80mm !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
        }
        .vyapar-print-sheet {
          width: 72mm !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 2mm 1mm 5mm 1mm !important;
          box-sizing: border-box !important;
          background: #ffffff !important;
          color: #000000 !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
          overflow: visible !important;
        }
        .vyapar-print-sheet, .vyapar-print-sheet * {
          color: #000000 !important;
          text-shadow: none !important;
          box-shadow: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .vyapar-print-sheet [class*="border-"] {
          border-color: #000000 !important;
        }
      `
      : mode === 'thermal58'
      ? `
        html, body {
          width: 54mm !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
        }
        .vyapar-print-sheet {
          width: 48mm !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 1.5mm 0.5mm 4mm 0.5mm !important;
          box-sizing: border-box !important;
          background: #ffffff !important;
          color: #000000 !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          font-size: 9.5px !important;
          line-height: 1.25 !important;
          overflow: visible !important;
          word-break: break-word !important;
        }
        .vyapar-print-sheet, .vyapar-print-sheet * {
          color: #000000 !important;
          text-shadow: none !important;
          box-shadow: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .vyapar-print-sheet [class*="border-"] {
          border-color: #000000 !important;
        }
      `
      : `
        html, body {
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .vyapar-print-sheet {
          width: 100% !important;
          max-width: 194mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          background: #ffffff !important;
          color: #000000 !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .vyapar-print-sheet table {
          width: 100% !important;
          border-collapse: collapse !important;
          page-break-inside: auto !important;
        }
        .vyapar-print-sheet thead {
          display: table-header-group !important;
        }
        .vyapar-print-sheet tr,
        .vyapar-print-sheet .print-avoid-break {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      `;

  return `
    ${pageRule}
    @media screen, print {
      .no-print {
        display: none !important;
      }
    }
    ${containerRule}
  `;
}

/**
 * Syncs dynamic @page rules into document.head so even native Browser -> Print (Ctrl+P)
 * respects the active paper format (80mm, 54mm, or A4).
 */
export function syncMainDocumentPrintStyle(mode: PrintPaperMode | null): void {
  if (typeof document === 'undefined') return;
  let styleEl = document.getElementById(DYNAMIC_PAGE_STYLE_ID) as HTMLStyleElement | null;

  if (!mode) {
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = DYNAMIC_PAGE_STYLE_ID;
    document.head.appendChild(styleEl);
  }

  const pageOnly =
    mode === 'thermal80'
      ? `@page { size: 80mm auto; margin: 0mm; }`
      : mode === 'thermal58'
      ? `@page { size: 54mm auto; margin: 0mm; }`
      : mode === 'tax_invoice'
      ? `@page { size: A4 portrait; margin: 8mm; }`
      : `@page { size: A4 portrait; margin: 10mm; }`;

  styleEl.textContent = `
    @media print {
      ${pageOnly}
    }
  `;
}

/**
 * Prints an HTML element inside a dedicated, isolated same-origin hidden <iframe>
 * with pure white/black paper variables (free from dark-mode, theme tinting,
 * parent overflow:hidden clipping, or preview zoom transforms).
 */
export async function printElementCleanly(
  sourceElement: HTMLElement | null,
  mode: PrintPaperMode,
  documentTitle: string = 'VyaparPOS-Receipt'
): Promise<void> {
  syncMainDocumentPrintStyle(mode);

  if (!sourceElement || typeof document === 'undefined') {
    window.print();
    return;
  }

  try {
    const existing = document.getElementById(PRINT_IFRAME_ID);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const iframe = document.createElement('iframe');
    iframe.id = PRINT_IFRAME_ID;
    iframe.className = 'no-print';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const iframeWin = iframe.contentWindow;
    if (!iframeDoc || !iframeWin) {
      window.print();
      return;
    }

    // Clone active stylesheets (<link rel="stylesheet"> & <style>) except dynamic page style
    const headNodes = Array.from(
      document.head.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], style')
    )
      .filter(node => node.id !== DYNAMIC_PAGE_STYLE_ID)
      .map(node => node.outerHTML)
      .join('\n');

    // Clone receipt HTML and ensure .vyapar-print-sheet class is present and inline transforms stripped
    const clonedNode = sourceElement.cloneNode(true) as HTMLElement;
    clonedNode.removeAttribute('style');
    clonedNode.classList.add('vyapar-print-sheet');
    // Remove any .no-print interactive widgets from the cloned receipt before printing
    clonedNode.querySelectorAll('.no-print').forEach(el => el.remove());

    // Override custom theme neutral variables to pure crisp print grays/black/white
    const purePrintPaletteReset = `
      :root {
        --color-neutral-50: #fafafa !important;
        --color-neutral-100: #f4f4f5 !important;
        --color-neutral-200: #e4e4e7 !important;
        --color-neutral-300: #d4d4d8 !important;
        --color-neutral-400: #71717a !important;
        --color-neutral-500: #52525b !important;
        --color-neutral-600: #3f3f46 !important;
        --color-neutral-700: #27272a !important;
        --color-neutral-800: #18181b !important;
        --color-neutral-900: #000000 !important;
        --color-neutral-950: #000000 !important;
      }
    `;

    const htmlString = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${documentTitle.replace(/[<>]/g, '')}</title>
    ${headNodes}
    <style>
      ${purePrintPaletteReset}
      ${buildFormatPrintCss(mode)}
    </style>
  </head>
  <body>
    ${clonedNode.outerHTML}
  </body>
</html>`;

    iframeDoc.open();
    iframeDoc.write(htmlString);
    iframeDoc.close();

    // Wait for fonts & QR images inside the print iframe to finish decoding
    const images = Array.from(iframeDoc.images || []);
    await Promise.all(
      images.map(
        img =>
          new Promise<void>(resolve => {
            if (img.complete) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );

    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await Promise.race([
        iframeDoc.fonts.ready,
        new Promise(resolve => setTimeout(resolve, 400)),
      ]);
    }

    await new Promise(resolve => setTimeout(resolve, 60));

    iframeWin.focus();
    iframeWin.print();

    // Cleanup iframe after print dialog closes
    setTimeout(() => {
      const stale = document.getElementById(PRINT_IFRAME_ID);
      if (stale && stale.parentNode) {
        stale.parentNode.removeChild(stale);
      }
    }, 3000);
  } catch {
    window.print();
  }
}
