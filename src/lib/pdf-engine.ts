import type { PDFDocumentProxy } from 'pdfjs-dist';

export type PDFSource = string | URL | ArrayBuffer | Uint8Array;

/**
 * Loads a PDF document
 */
export async function loadPdf(source: PDFSource): Promise<PDFDocumentProxy> {
    if (typeof window === 'undefined') {
        throw new Error('PDF loading is not supported in server-side rendering');
    }

    // Dynamic import to avoid SSR loading of pdfjs-dist which requires DOM globals like DOMMatrix
    const pdfjs = await import('pdfjs-dist');

    // Set worker source to local static file to avoid CORS/ESM issues
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const loadingTask = pdfjs.getDocument(source);
    return loadingTask.promise;
}

/**
 * Renders a specific page of a PDF to a Blob URL (image/png)
 * This allows us to use standard <img> tags in the flipbook.
 * 
 * @param pdf - The PDF Document Proxy
 * @param pageNum - Page number (1-based)
 * @param scale - Scale factor (default 1.5 or 2 for high density)
 * @returns Promise<string> - A blob URL string
 */
export async function renderPageToBlob(
    pdf: PDFDocumentProxy,
    pageNum: number,
    scale: number = 2.0
): Promise<string> {
    const page = await pdf.getPage(pageNum);

    // Create a temporary canvas
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas 2d context not available');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: context,
        viewport: viewport,
    } as any; // forceful cast to avoid type version mismatch issues for now

    await page.render(renderContext).promise;

    // Convert to Blob URL
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(URL.createObjectURL(blob));
            } else {
                reject(new Error('Canvas to Blob failed'));
            }
        }, 'image/png');
    });
}
