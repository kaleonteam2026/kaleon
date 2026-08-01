/**
 * Server-side PDF text extraction.
 *
 * pdfjs-dist works reliably on Node.js when the worker is
 * disabled — no CORS/module-worker issues like in mobile Safari.
 * The file is never written to disk; only the extracted text
 * string leaves this function.
 */

// Use the legacy build — the main build references DOM globals (DOMMatrix)
// that don't exist in Node.js. Legacy works on the server with no worker.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Extract all text from a PDF buffer, returning it as a single string.
 *
 * @param buffer - Raw PDF bytes (read from the request body).
 * @returns Concatenated text from every page, pages separated by newlines.
 */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // pdfjs-dist's types don't list these worker options even though it
  // supports them at runtime — cast via a generic record.
  const docOpts = {
    data: new Uint8Array(buffer),
    disableWorker: true,       // no worker needed on Node.js
    disableFontFace: true,     // we only need text content, not rendering
    useSystemFonts: false,
    verbosity: 0,
    cMapUrl: undefined,
    cMapPacked: false,
  } as Record<string, unknown>;

  const pdf = await getDocument(docOpts as Parameters<typeof getDocument>[0]).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }

  // Guard: no text at all suggests a scanned / image-only PDF
  if (!fullText.trim() && pdf.numPages > 0) {
    throw new Error(
      "This PDF appears to be a scanned document with no selectable text. " +
        "Please upload a digital transcript exported from your student portal.",
    );
  }

  return fullText;
}
