/**
 * @fileoverview MyToolKitPro - Add Margin to PDF Logic
 * @description Provides advanced PDF page resizing and margin adjustments. 
 * Supports unified or individual side margins, unit conversion (mm, cm, in, px), 
 * background color filling, and odd/even page mirroring for book binding.
 * @architecture tools/pdf/add-margin.html
 * @dependencies pdf-lib, pdf.js, utils (fileHandler, dragDrop, pageRange, pdfPreview, helpers)
 * @version 1.1.0
 * @author MyToolKitPro
 */

import { handlePdfFile } from "../../utils/fileHandler.min.js";
import { setupDragDrop } from "../../utils/dragDrop.min.js";
import { parsePageRange } from "../../utils/pageRange.min.js";
import { renderPdfPreview } from "../../utils/pdfPreview.min.js";
import { initAccordions, resetAccordions } from "../../utils/helpers.min.js";

document.addEventListener("DOMContentLoaded", () => {
    // --------------------------------------------------
    // DOM Elements
    // --------------------------------------------------
    const uploadArea = document.getElementById("upload-area");
    const pdfFile = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");
    const filePreviewArea = document.getElementById("file-preview-area");
    const pdfViewer = document.getElementById("pdf-viewer");
    const previewLoader = document.getElementById("preview-loader");
    const filenameDisplay = document.getElementById("filename-display");
    const filesizeDisplay = document.getElementById("filesize-display");
    const warningMessage = document.getElementById("warning-message");

    const accordionHeaders = document.querySelectorAll('.accordion-header');
    const unitSelect = document.getElementById("unit-select");
    const syncMarginsToggle = document.getElementById("sync-margins");
    const allSidesContainer = document.getElementById("all-sides-container");
    const individualContainer = document.getElementById("individual-margins-container");
    const marginAll = document.getElementById("margin-all");
    const mT = document.getElementById("margin-top"),
          mB = document.getElementById("margin-bottom"),
          mL = document.getElementById("margin-left"),
          mR = document.getElementById("margin-right");
    const oddEvenToggle = document.getElementById("different-odd-even");
    const customRangeInput = document.getElementById("custom-range");
    const customRangeError = document.getElementById("custom-range-error");

    const bgColorPicker = document.getElementById("bg-color");
    const previewCircle = document.getElementById('color-preview-circle');
    const bgHexDisplay = document.getElementById("bg-hex");
    const pageSizeSelect = document.getElementById("page-size");
    const orientationBtns = document.querySelectorAll(".orientation-btn");

    const processBtn = document.getElementById("process-pdf-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");
    const prevPageBtn = document.getElementById("prev-page-btn");
    const nextPageBtn = document.getElementById("next-page-btn");
    const currentPageDisplay = document.getElementById("current-page-num");
    const totalPageDisplay = document.getElementById("preview-total-pages");
    const processingState = document.getElementById("processing-state");
    const progressText = document.getElementById("progress-text");
    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-btn");
    const resetBtn = document.getElementById("reset-btn");

    // --------------------------------------------------
    // State & Constants
    // --------------------------------------------------
    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = '../../assets/js/vendor/pdf.worker.min.js';

    let pdfArrayBuffer = null;
    let originalPdfFile = null;
    let processedPdfBlob = null;
    let currentPageIndex = 0;
    let pdfOrientation = 'p';
    let pdfObserver = null; 

    const MAX_FILE_SIZE = 100;
    const LARGE_FILE_THRESHOLD = 30;

    // --------------------------------------------------
    // UI Controls
    // --------------------------------------------------
    pdfFile?.addEventListener("change", e => handleFileWrapper(e.target.files[0]));
    resetBtn.addEventListener("click", () => { resetUI(); uploadArea.scrollIntoView({behavior:'smooth', block:'center'}); });
    removeFileBtn.addEventListener("click", () => { resetUI(); uploadArea.scrollIntoView({behavior:'smooth', block:'center'}); });
    initAccordions();

    syncMarginsToggle?.addEventListener("change", () => {
        const isSynced = syncMarginsToggle.checked;
        allSidesContainer.classList.toggle("hidden", !isSynced);
        individualContainer.classList.toggle("hidden", isSynced);
        if (isSynced) oddEvenToggle.checked = false;
    });

    marginAll?.addEventListener("input", e => {
        const val = parseFloat(e.target.value || 0);
        if (syncMarginsToggle.checked) mT.value = mB.value = mL.value = mR.value = val;
    });

    bgColorPicker?.addEventListener("input", e => {
        const newColor = e.target.value.toUpperCase();
        bgHexDisplay.textContent = newColor;
        previewCircle.style.backgroundColor = newColor;
    });

    orientationBtns?.forEach(btn => {
        btn.addEventListener("click", () => {
            orientationBtns.forEach(b => {
                b.classList.remove("bg-primary", "text-white", "border-primary");
                b.classList.add("bg-slate-100", "text-slate-500", "border-slate-300");
            });
            btn.classList.remove("bg-slate-100", "text-slate-500", "border-slate-300");
            btn.classList.add("bg-primary", "text-white");
            pdfOrientation = btn.getAttribute("data-value");
        });
    });

    customRangeInput.addEventListener("input", () => {
        const totalPages = pdfViewer.querySelectorAll('canvas').length;

        const { warnings } = parsePageRange(customRangeInput.value, '', totalPages);

        if (warnings.length > 0) {
            customRangeError.textContent = warnings[0];
            customRangeError.classList.remove("hidden");
        } else {
            customRangeError.classList.add("hidden");
        }
        
        const hasError = !customRangeError.classList.contains("hidden");
        processBtn.disabled = hasError;
        processBtn.classList.toggle("opacity-50", hasError);
        processBtn.classList.toggle("cursor-not-allowed", hasError);
        processBtn.classList.toggle("cursor-pointer", !hasError);
    });

    // --------------------------------------------------
    // Drag & Drop Setup
    // --------------------------------------------------
    setupDragDrop(uploadArea, {
        onFilesDropped: (files) => {
            if (files.length > 1) {
                alert("Only one file allowed");
                return;
            }
            handleFileWrapper(files[0]);
        }
    });

    async function handleFileWrapper(file) {
        uploadErrorMessage.classList.add("hidden");

        const result = await handlePdfFile(file, {
            maxSizeMB: MAX_FILE_SIZE,
            largeFileMB: LARGE_FILE_THRESHOLD,
            showError: (msg) => {
                console.error(msg);
                uploadErrorMessage.textContent = msg;
                uploadErrorMessage.classList.remove("hidden");
            },
            showWarning: (msg) => {
                warningMessage.textContent = msg;
                warningMessage.classList.remove("hidden");
            }
        });

        if (!result.success) return;

        pdfArrayBuffer = result.buffer;
        originalPdfFile = result.file;

        filenameDisplay.textContent = result.meta.name;
        filesizeDisplay.textContent = result.meta.sizeMB + " MB";

        uploadArea.classList.add("hidden");
        filePreviewArea.classList.remove("hidden");

        previewLoader.classList.remove("hidden");

        pdfObserver?.disconnect();
        pdfObserver = null;

        await renderPdfPreview({
            buffer: pdfArrayBuffer,
            pdfViewer: pdfViewer,
            previewLoader: previewLoader,
            totalPageDisplay: totalPageDisplay,
            observer: pdfObserver,
            updateNavUI: updateNavUI
        });

        const canvases = pdfViewer.querySelectorAll('canvas');
        if (canvases.length > 0) {
            pdfObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        currentPageIndex = Array.from(canvases).indexOf(entry.target);
                        updateNavUI(currentPageIndex, canvases.length);
                    }
                });
            }, { root: pdfViewer, threshold: 0.5 });
            canvases.forEach(canvas => pdfObserver.observe(canvas));
        }

        previewLoader.classList.add("hidden");
    }

    // --------------------------------------------------
    // Navigation
    // --------------------------------------------------
    const updateNavUI = (index, total) => {
        currentPageDisplay.textContent = index + 1;
        prevPageBtn?.classList.toggle("hidden", index <= 0);
        nextPageBtn?.classList.toggle("hidden", index >= total - 1);
    };

    nextPageBtn?.addEventListener("click", () => {
        const canvases = pdfViewer.querySelectorAll('canvas');
        if (currentPageIndex < canvases.length - 1) {
            canvases[currentPageIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    prevPageBtn?.addEventListener("click", () => {
        const canvases = pdfViewer.querySelectorAll('canvas');
        if (currentPageIndex > 0) {
            canvases[currentPageIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    // --------------------------------------------------
    // Process PDF
    // --------------------------------------------------
    processBtn?.addEventListener("click", async () => {
        if (!pdfArrayBuffer || !originalPdfFile) return;

        filePreviewArea.classList.add("hidden");
        processingState.classList.remove("hidden");
        processingState.scrollIntoView({ behavior: "smooth", block: "center" });

        try {
            const freshBuffer = await originalPdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(freshBuffer);
            const newPdf = await PDFLib.PDFDocument.create();
            const sourcePages = pdfDoc.getPages();

            const UNIT_MAP = { mm: 2.83465, cm: 28.3465, in: 72, px: 0.75 };
            const multi = UNIT_MAP[unitSelect.value];

            const baseMargins = {
                t: parseFloat(mT.value || 0) * multi,
                b: parseFloat(mB.value || 0) * multi,
                l: parseFloat(mL.value || 0) * multi,
                r: parseFloat(mR.value || 0) * multi
            };

            const { pages: targetPages, warnings } = parsePageRange(customRangeInput.value, '', sourcePages.length);
            if (warnings.length > 0) {
                customRangeError.textContent = warnings[0];
                customRangeError.classList.remove("hidden");
                processingState.classList.add("hidden");
                filePreviewArea.classList.remove("hidden");
                return;
            } else {
                customRangeError.classList.add("hidden");
            }

            const bgColor = bgColorPicker.value;
            const hexToRgb = (hex) => {
                const r = parseInt(hex.slice(1, 3), 16) / 255;
                const g = parseInt(hex.slice(3, 5), 16) / 255;
                const b = parseInt(hex.slice(5, 7), 16) / 255;
                return PDFLib.rgb(r, g, b);
            };

            const embeddedPages = await newPdf.embedPages(sourcePages);

            for (let index = 0; index < embeddedPages.length; index++) {
                progressText.innerText = `Refining page ${index + 1} of ${embeddedPages.length}`;
                const embeddedPage = embeddedPages[index];
                const originalPage = sourcePages[index];
                const { width, height } = originalPage.getSize();

                const isTarget = targetPages.includes(index + 1);
                let m = { ...baseMargins };

                if (oddEvenToggle.checked && (index % 2 !== 0)) {
                    [m.l, m.r] = [m.r, m.l];
                }

                let finalW = width, finalH = height, xOff = 0, yOff = 0;
                if (isTarget) {
                    if (pageSizeSelect.value === 'original') { finalW += m.l + m.r; finalH += m.t + m.b; xOff = m.l; yOff = m.b; }
                    else {
                        const sizes = { a4: [595, 842], letter: [612, 792], legal: [612, 1008] };
                        [finalW, finalH] = sizes[pageSizeSelect.value];
                        if (pdfOrientation === 'l') [finalW, finalH] = [finalH, finalW];
                        xOff = (finalW - width) / 2; yOff = (finalH - height) / 2;
                    }
                }

                const newPage = newPdf.addPage([finalW, finalH]);
                newPage.drawRectangle({ x: 0, y: 0, width: finalW, height: finalH, color: hexToRgb(bgColor) });
                newPage.drawPage(embeddedPage, { x: xOff, y: yOff, width: width, height: height });
            }

            const pdfBytes = await newPdf.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (err) {
            console.error("Processing Error:", err);
            alert("An error occurred while processing the PDF. Check the console for details.");
            processingState.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");
        }
    });

    // --------------------------------------------------
    // Download
    // --------------------------------------------------
    downloadPdfBtn?.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(processedPdfBlob);
        link.download = `mytoolkitpro-${originalPdfFile.name}`;
        link.click();
        URL.revokeObjectURL(link.href);
    });

    // --------------------------------------------------
    // Reset UI
    // --------------------------------------------------
    const resetUI = () => {
        if (pdfObserver) {
            pdfObserver.disconnect();
            pdfObserver = null;
        }
        pdfArrayBuffer = null;
        originalPdfFile = null;
        processedPdfBlob = null;
        currentPageIndex = 0;

        pdfFile.value = "";
        customRangeInput.value = "";
        marginAll.value = "10";
        mT.value = mB.value = mL.value = mR.value = "10";
        syncMarginsToggle.checked = true;
        oddEvenToggle.checked = false;
        unitSelect.value = "mm";
        pageSizeSelect.value = "original";
        allSidesContainer.classList.remove("hidden");
        individualContainer.classList.add("hidden");
        bgColorPicker.value = "#FFFFFF";
        bgHexDisplay.textContent = "#FFFFFF";
        previewCircle.style.backgroundColor = "#FFFFFF";
        pdfOrientation = 'p';
        pdfViewer.innerHTML = '';
        pdfViewer.scrollTop = 0;
        totalPageDisplay.textContent = "--";
        currentPageDisplay.textContent = "1";
        uploadArea.classList.remove("hidden");
        filePreviewArea.classList.add("hidden");
        resultsArea.classList.add("hidden");
        processingState.classList.add("hidden");
        uploadErrorMessage.classList.add("hidden");
        warningMessage.classList.add("hidden");
        resetAccordions();
    };

});