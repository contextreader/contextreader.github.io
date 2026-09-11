/**
 * PDFium Text Layer — Uses PDFium WASM for correct Sinhala text extraction.
 * Replaces PDF.js renderTextLayer() for pages containing Sinhala text.
 *
 * PDF.js extracts garbled text from Sinhala PDFs (broken ToUnicode font tables).
 * PDFium (Chrome's native engine) handles these fonts correctly.
 * We use PDF.js for canvas rendering + PDFium for text extraction.
 *
 * Usage:
 *   await PdfiumTextLayer.init();
 *   await PdfiumTextLayer.loadDocument(buffer);
 *   PdfiumTextLayer.buildTextLayer(pageNum, container, viewport, textContent);
 *   PdfiumTextLayer.destroy();
 */

import { PDFiumLibrary } from '@hyzyla/pdfium';

let library = null;
let pdfiumDoc = null;

/**
 * Initialize PDFium WASM. Call once at startup.
 */
async function init() {
  if (library) return;
  const wasmUrl = typeof chrome !== 'undefined' && chrome.runtime
    ? chrome.runtime.getURL('vendor/pdfium.wasm')
    : 'vendor/pdfium.wasm';

  library = await PDFiumLibrary.init({ wasmUrl });
}

/**
 * Load a PDF document into PDFium.
 * @param {ArrayBuffer|Uint8Array} buffer - The PDF file bytes
 */
async function loadDocument(buffer) {
  if (!library) throw new Error('PDFium not initialized. Call init() first.');
  if (pdfiumDoc) {
    pdfiumDoc.destroy();
    pdfiumDoc = null;
  }
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  pdfiumDoc = await library.loadDocument(data);
}

/**
 * Extract text from a page.
 * @param {number} pageIndex - 0-based page index
 * @returns {string} Full page text
 */
function getPageText(pageIndex) {
  if (!pdfiumDoc) return '';
  const page = pdfiumDoc.getPage(pageIndex);
  return page.getText();
}

/**
 * Build a custom text layer using PDFium's correct text + PDF.js positions.
 *
 * Strategy: Use PDF.js line groups for Y-position and left margin only.
 * Use PDFium text for content. Make spans full container width so
 * all text is selectable regardless of width calculation accuracy.
 *
 * @param {number} pageNumber - 1-based page number
 * @param {HTMLElement} container - The .textLayer div
 * @param {object} viewport - PDF.js viewport
 * @param {object} textContent - PDF.js textContent (for position data)
 */
function buildTextLayer(pageNumber, container, viewport, textContent) {
  if (!pdfiumDoc) return;

  const pageIndex = pageNumber - 1;
  const page = pdfiumDoc.getPage(pageIndex);
  const pdfiumText = page.getText();

  // Split PDFium text into lines — handle both \r\n and \n
  const pdfiumLines = pdfiumText.split(/\r?\n/).filter(l => l.trim().length > 0);

  // Group PDF.js items by line (Y position)
  const lineGroups = groupItemsByLine(textContent.items);

  // Container width for full-width spans
  const containerWidth = parseFloat(container.style.width) || viewport.width;

  // Map PDFium lines to PDF.js line groups
  // Use sequential mapping with skip logic for empty PDF.js lines
  let pdfiumIdx = 0;

  for (const line of lineGroups) {
    if (line.items.length === 0) continue;

    const firstItem = line.items[0];
    if (!firstItem.transform) continue;

    // Skip lines that are just whitespace in PDF.js
    const pdfJsLineText = line.items.map(i => i.str).join('').trim();
    if (pdfJsLineText.length === 0) continue;

    // Get text for this line from PDFium
    let lineText = '';
    if (pdfiumIdx < pdfiumLines.length) {
      lineText = pdfiumLines[pdfiumIdx];
      pdfiumIdx++;
    } else {
      // Exhausted PDFium lines — use PDF.js text as fallback
      lineText = pdfJsLineText;
    }

    if (lineText.trim().length === 0) continue;

    // Position from PDF.js transform: [scaleX, skewY, skewX, scaleY, tx, ty]
    const tx = firstItem.transform[4];
    const ty = firstItem.transform[5];
    const fontSize = Math.sqrt(
      firstItem.transform[0] ** 2 + firstItem.transform[1] ** 2
    );

    // Convert PDF coords to viewport coords
    const [screenX, screenY] = viewport.convertToViewportPoint(tx, ty);

    // Create span — full width from left edge to container edge
    const span = document.createElement('span');
    span.textContent = lineText;
    span.style.position = 'absolute';
    span.style.left = `${screenX}px`;
    // PDF Y-axis is bottom-up — adjust by font size for baseline
    span.style.top = `${screenY - (fontSize * viewport.scale)}px`;
    span.style.fontSize = `${fontSize * viewport.scale}px`;
    span.style.fontFamily = "'Noto Sans Sinhala', serif, sans-serif";
    span.style.color = 'transparent';
    span.style.whiteSpace = 'pre';
    span.style.cursor = 'text';
    span.style.transformOrigin = '0% 0%';
    // Full width from this span's left to the container's right edge
    span.style.width = `${containerWidth - screenX}px`;

    container.appendChild(span);
  }
}

/**
 * Group text content items by line (Y position).
 */
function groupItemsByLine(items) {
  const lines = [];
  let currentLine = null;

  for (const item of items) {
    if (item.str === undefined || !item.transform) continue;

    const ty = item.transform[5];

    if (!currentLine || Math.abs(currentLine.y - ty) > 2) {
      currentLine = { y: ty, items: [] };
      lines.push(currentLine);
    }
    currentLine.items.push(item);
  }

  // Sort items within each line by X position
  for (const line of lines) {
    line.items.sort((a, b) => (a.transform[4] || 0) - (b.transform[4] || 0));
  }

  return lines;
}

/**
 * Cleanup PDFium resources.
 */
function destroy() {
  if (pdfiumDoc) { pdfiumDoc.destroy(); pdfiumDoc = null; }
  if (library) { library.destroy(); library = null; }
}

export { init, loadDocument, getPageText, buildTextLayer, destroy };
