/**
 * YantraStack - Shared PDF Preview Renderer
 * --------------------------------------------------
 * Purpose:
 * Centralized utility to render PDF previews across all tools
 * (add-margin, add-page-numbers, merge, compress, etc.)
 *
 * Why this exists:
 * - Avoids duplicate preview logic in every tool
 * - Ensures consistent UI/UX across all PDF tools
 * - Improves performance with batch rendering (non-blocking)
 * - Supports high-DPI screens (retina scaling)
 *
 * Key Features:
 * - Batch rendering (prevents UI freezing on large PDFs)
 * - DevicePixelRatio-aware (sharp rendering)
 * - IntersectionObserver support (page tracking)
 * - Auto scaling to fit container
 *
 * Usage:
 * import { renderPdfPreview } from "../utils/pdfPreview.js";
 *
 * await renderPdfPreview({
 *   buffer,
 *   pdfViewer,
 *   previewLoader,
 *   totalPageDisplay,
 *   observer,
 *   updateNavUI
 * });
 *
 * Dependencies:
 * - pdf.js (window.pdfjsLib)
 *
 * Notes:
 * - This function is UI-focused (canvas rendering only)
 * - Does NOT modify PDFs (use pdf-lib for processing)
 * - Keep this lightweight — avoid adding tool-specific logic here
 */

export async function renderPdfPreview({
    buffer,
    pdfViewer,
    previewLoader,
    totalPageDisplay,
    observer,
    updateNavUI
}) {
    pdfViewer.innerHTML = '';
    observer?.disconnect();
 
    previewLoader.classList.remove("hidden");

    try {
        const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
        const totalPages = pdf.numPages;
        totalPageDisplay.textContent = totalPages;

        const containerWidth = pdfViewer.clientWidth || 800;
        const containerHeight = pdfViewer.clientHeight || window.innerHeight * 0.75;
        const dpr = window.devicePixelRatio || 1;

        const BATCH_SIZE = 3;

        const newObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = Number(entry.target.dataset.pageIndex);
                    updateNavUI(index, totalPages);
                }
            });
        }, { threshold: 0.5 });

        for (let i = 1; i <= totalPages; i += BATCH_SIZE) {
            const batch = [];

            for (let j = i; j < i + BATCH_SIZE && j <= totalPages; j++) {
                batch.push(
                    (async () => {
                        const page = await pdf.getPage(j);

                        const viewport = page.getViewport({ scale: 1 });
                        const scale = Math.min(
                            containerWidth / viewport.width,
                            containerHeight / viewport.height
                        );
                        const finalScale = Math.min(Math.max(scale, 0.4), 1.2);

                        const scaledViewport = page.getViewport({ scale: finalScale });

                        const canvas = document.createElement("canvas");
                        const context = canvas.getContext("2d");

                        canvas.width = scaledViewport.width * dpr;
                        canvas.height = scaledViewport.height * dpr;
                        canvas.style.width = `${scaledViewport.width}px`;
                        canvas.style.height = `${scaledViewport.height}px`;

                        context.setTransform(dpr, 0, 0, dpr, 0, 0);

                        canvas.className = "block mx-auto mb-6 rounded-lg shadow-lg border border-slate-300 bg-white";
                        canvas.dataset.pageIndex = j - 1;

                        await page.render({
                            canvasContext: context,
                            viewport: scaledViewport
                        }).promise;

                        return canvas;
                    })()
                );
            }
            const canvases = await Promise.all(batch);
            canvases.forEach(canvas => {
                pdfViewer.appendChild(canvas);
                newObserver?.observe(canvas);
            });
            await new Promise(r => setTimeout(r, 0));
        }
        updateNavUI(0, totalPages);
        return newObserver;
    } catch (error) {
        console.error("Render Preview Error:", error);
    } finally {
        previewLoader.classList.add("hidden");
    }
}