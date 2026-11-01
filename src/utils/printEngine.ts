export type PrintPaperMode = 'thermal80' | 'thermal58' | 'tax_invoice' | 'a4_report';

const DYNAMIC_PAGE_STYLE_ID = 'vyapar-dynamic-page-style';
const PRINT_IFRAME_ID = 'vyapar-clean-print-iframe';

/**
 * Returns @page and print container CSS that preserves 1:1 WYSIWYG parity
 * with the Screen Preview (.vyapar-paper-sheet + .vyapar-paper-* classes in index.css):
 * - thermal80   : 80mm paper, 4mm side padding => 72mm inner content (same on Preview & Print)
 * - thermal58   : 54mm paper, 3mm side padding => 48mm inner content (same on Preview & Print)
 * - tax_invoice : A4 portrait (210mm), 8mm @page margin => 194mm inner content (same on Preview & Print)
 * - a4_report   : A4 portrait (210mm), 10mm @page margin => 190mm inner content (same on Preview & Print)
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
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .vyapar-paper-sheet.vyapar-paper-thermal80 {
          width: 80mm !important;
          min-width: 0 !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 3mm 4mm 5mm 4mm !important;
          box-sizing: border-box !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }
      `
      : mode === 'thermal58'
      ? `
        html, body {
          width: 54mm !important;
          max-width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .vyapar-paper-sheet.vyapar-paper-thermal54 {
          width: 54mm !important;
          min-width: 0 !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 2.5mm 3mm 4mm 3mm !important;
          box-sizing: border-box !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }
      `
      : mode === 'tax_invoice'
      ? `
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
        /* @page already provides the 8mm outer margin on every A4 page => 210mm - 16mm = 194mm exact content width */
        .vyapar-paper-sheet.vyapar-paper-a4 {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 194mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
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
        /* @page already provides the 10mm outer margin on every A4 report page => 210mm - 20mm = 190mm exact content width */
        .vyapar-paper-sheet.vyapar-paper-report {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 190mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }
      `;

  return `
    ${pageRule}
    @media screen, print {
      .no-print {
        display: none !important;
      }
      .vyapar-paper-sheet table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
      }
      .vyapar-paper-sheet thead {
        display: table-header-group;
      }
      .vyapar-paper-sheet tr,
      .vyapar-paper-sheet .print-avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
    ${containerRule}
  `;
}

/**
 * Syncs dynamic @page rules into document.head so native Browser -> Print (Ctrl+P)
 * also respects the active paper format (80mm, 54mm, or A4).
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
 * Serializes all accessible CSS rules from document.styleSheets synchronously so
 * Tailwind CSS v4 utilities and .vyapar-paper-* rules are 100% present in the print
 * iframe immediately, plus collects external cross-origin <link rel="stylesheet"> URLs
 * (e.g. Google Fonts) so we can await their load cleanly.
 */
function collectDocumentStyles(): { inlineCssText: string; externalLinkTags: string } {
  const inlineChunks: string[] = [];
  const externalLinks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    const ownerNode = sheet.ownerNode as HTMLElement | null;
    if (ownerNode && ownerNode.id === DYNAMIC_PAGE_STYLE_ID) {
      continue;
    }

    try {
      const rules = sheet.cssRules;
      if (rules) {
        const cssText = Array.from(rules)
          .map(rule => rule.cssText)
          .join('\n');
        if (cssText) {
          inlineChunks.push(cssText);
        }
      }
    } catch {
      // Cross-origin stylesheet (e.g., Google Fonts): preserve its <link> tag
      if (sheet.href) {
        externalLinks.push(
          `<link rel="stylesheet" href="${sheet.href.replace(/"/g, '&quot;')}" />`
        );
      }
    }
  }

  // Fallback if no stylesheets were readable
  if (inlineChunks.length === 0) {
    const fallbackNodes = Array.from(
      document.head.querySelectorAll('link[rel="stylesheet"], style')
    )
      .filter(node => node.id !== DYNAMIC_PAGE_STYLE_ID)
      .map(node => node.outerHTML);
    externalLinks.push(...fallbackNodes);
  }

  return {
    inlineCssText: inlineChunks.join('\n'),
    externalLinkTags: externalLinks.join('\n'),
  };
}

/**
 * Prints the receipt/invoice element inside an isolated hidden same-origin <iframe>
 * using the exact same .vyapar-paper-sheet and .vyapar-paper-* classes, fonts,
 * dimensions, borders, and neutral variables as the Bill Preview.
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

    const { inlineCssText, externalLinkTags } = collectDocumentStyles();

    // Clone the exact preview paper node without modifying its inner typography or borders
    const clonedNode = sourceElement.cloneNode(true) as HTMLElement;
    clonedNode.removeAttribute('style');
    clonedNode.classList.add('vyapar-paper-sheet');
    if (mode === 'thermal80') clonedNode.classList.add('vyapar-paper-thermal80');
    else if (mode === 'thermal58') clonedNode.classList.add('vyapar-paper-thermal54');
    else if (mode === 'tax_invoice') clonedNode.classList.add('vyapar-paper-a4');
    else if (mode === 'a4_report') clonedNode.classList.add('vyapar-paper-report');

    // Strip any screen-only interactive controls (.no-print) if edit mode happened to be open
    clonedNode.querySelectorAll('.no-print').forEach(el => el.remove());

    const baseHref = window.location.href.replace(/"/g, '&quot;');
    const htmlString = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <base href="${baseHref}" />
    <title>${documentTitle.replace(/[<>]/g, '')}</title>
    ${externalLinkTags}
    <style id="vyapar-serialized-app-css">
      ${inlineCssText}
    </style>
    <style id="vyapar-wysiwyg-print-css">
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

    // 1. Wait for any external font stylesheets (<link rel="stylesheet">) with a safe timeout
    const linkEls = Array.from(
      iframeDoc.querySelectorAll('link[rel="stylesheet"]')
    ) as HTMLLinkElement[];
    if (linkEls.length > 0) {
      await Promise.race([
        Promise.all(
          linkEls.map(
            link =>
              new Promise<void>(resolve => {
                if (link.sheet) {
                  resolve();
                  return;
                }
                link.onload = () => resolve();
                link.onerror = () => resolve();
              })
          )
        ),
        new Promise<void>(resolve => setTimeout(resolve, 800)),
      ]);
    }

    // 2. Wait for QR / logo images inside the print iframe to finish decoding
    const images = Array.from(iframeDoc.images || []);
    if (images.length > 0) {
      await Promise.race([
        Promise.all(
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
        ),
        new Promise<void>(resolve => setTimeout(resolve, 800)),
      ]);
    }

    // 3. Wait for webfonts (Plus Jakarta Sans / JetBrains Mono) so line breaks match Preview 1:1
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await Promise.race([
        iframeDoc.fonts.ready,
        new Promise<void>(resolve => setTimeout(resolve, 600)),
      ]);
    }

    // Allow layout & paint flush inside iframe before invoking print
    await new Promise<void>(resolve => setTimeout(resolve, 80));

    iframeWin.focus();
    iframeWin.print();

    setTimeout(() => {
      const stale = document.getElementById(PRINT_IFRAME_ID);
      if (stale && stale.parentNode) {
        stale.parentNode.removeChild(stale);
      }
    }, 3500);
  } catch {
    window.print();
  }
}
