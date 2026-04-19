/**
 * @fileoverview MyToolKitPro - Add Page Numbers to PDF Logic
 * @description Provides comprehensive PDF pagination features including 
 * positioning, offset mirroring, rotation, custom text formatting, 
 * and specific page range targeting.
 * @architecture tools/pdf/add-page-numbers.html
 * @dependencies pdf-lib, pdf.js, utils (fileHandler, dragDrop, pageRange, pdfPreview, helpers)
 * @version 1.1.0
 * @author MyToolKitPro
 */

const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;

import { handlePdfFile } from "../../utils/fileHandler.min.js";
import { setupDragDrop } from "../../utils/dragDrop.min.js";
import { parsePageRange } from "../../utils/pageRange.min.js";
import { renderPdfPreview } from "../../utils/pdfPreview.min.js";
import { initAccordions, resetAccordions } from "../../utils/helpers.min.js";

document.addEventListener("DOMContentLoaded", () => {
    // --------------------------------------------------
    // DOM Elements
    // --------------------------------------------------
    const uploadArea = document.getElementById('upload-area');
    const pdfFile = document.getElementById('pdfFile');
    const uploadErrorMessage = document.getElementById('upload-error-message');

    const accordionHeaders = document.querySelectorAll('.accordion-header');
    const filePreviewArea = document.getElementById('file-preview-area');
    const filenameDisplay = document.getElementById('filename-display');
    const filesizeDisplay = document.getElementById('filesize-display');
    const warningMessage = document.getElementById('warning-message');

    const positionBtns = Array.from(document.querySelectorAll('.pos-btn'));
    const offsetXInput = document.getElementById('offset-x');
    const offsetYInput = document.getElementById('offset-y');
    const mirrorOddEven = document.getElementById('mirror-odd-even');
    const layerBehind = document.getElementById('layer-behind');
    const rotButtons = Array.from(document.querySelectorAll('.rot-btn'));

    const numberFormat = document.getElementById('number-format');
    const customFormatContainer = document.getElementById('custom-format-container');
    const customFormatInput = document.getElementById('custom-format-input');
    const fontFamily = document.getElementById('font-family');
    const fontSize = document.getElementById('font-size');
    const textColor = document.getElementById('text-color');
    const textColorPreview = document.getElementById('text-color-preview');
    const textColorHex = document.getElementById('text-color-hex');
    const startNumber = document.getElementById('start-number');

    const pageRange = document.getElementById('page-range');
    const pageRangeError = document.getElementById("page-range-error");
    const excludePages = document.getElementById('exclude-pages');
    const excludePagesError = document.getElementById("exclude-pages-error");
    const presetBtns = document.querySelectorAll(".preset-btn");

    const processPdfBtn = document.getElementById('process-pdf-btn');
    const removeFileBtn = document.getElementById('remove-file-btn');

    const previewLoader = document.getElementById('preview-loader');
    const pdfViewer = document.getElementById('pdf-viewer');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const currentPageNum = document.getElementById('current-page-num');
    const previewTotalPages = document.getElementById('preview-total-pages');

    const processingState = document.getElementById('processing-state');
    const progressText = document.getElementById('progress-text');

    const resultsArea = document.getElementById('results-area');
    const downloadBtn = document.getElementById('download-btn');
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
    let pdfObserver = null;
    let selectedPosition = 'bc';
    let selectedRotation = 0;
    let offsets = {
        x: parseInt(offsetXInput.value) || 0,
        y: parseInt(offsetYInput.value) || 0
    };

    const MAX_FILE_SIZE = 100;
    const LARGE_FILE_THRESHOLD = 30;

    // --------------------------------------------------
    // UI Controls
    // --------------------------------------------------
    pdfFile.addEventListener('change', e => handleFileWrapper(e.target.files[0]));
    resetBtn.addEventListener("click", () => { resetUI(); uploadArea.scrollIntoView({behavior:'smooth', block:'center'}); });
    removeFileBtn.addEventListener("click", () => { resetUI(); uploadArea.scrollIntoView({behavior:'smooth', block:'center'}); });
    initAccordions();

    const hexToRgb = (hex) => {
        if (!hex || hex[0] !== '#' || hex.length !== 7) hex = '#000000';
        try {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return rgb(r, g, b);
        } catch {
            return rgb(0, 0, 0);
        }
    };

    const formatText = (type, custom, n, total) => {
        if (type === "single") return `${n}`;
        if (type === "total") return `Page ${n} of ${total}`;
        if (type === "hyphen") return `- ${n} -`;
        if (type === "custom" && custom) {
            return custom.replace(/{n}/g, n).replace(/{total}/g, total);
        }
        return `Page ${n}`;
    };

    const getPosition = (pos, width, height, textWidth, fontSizeVal, offsetX, offsetY) => {
        let x = 0, y = 0;
        switch (pos) {
            case 'tl': x = offsetX; y = height - offsetY; break;
            case 'tc': x = width / 2 - textWidth / 2; y = height - offsetY; break;
            case 'tr': x = width - offsetX - textWidth; y = height - offsetY; break;
            case 'bl': x = offsetX; y = offsetY; break;
            case 'bc': x = width / 2 - textWidth / 2; y = offsetY; break;
            case 'br': x = width - offsetX - textWidth; y = offsetY; break;
        }
        return { x, y: y - fontSizeVal / 2 };
    };

    function handleWarnings(warnings, errorEl) {
        if (warnings.length > 0) {
            errorEl.textContent = warnings[0];
            errorEl.classList.remove("hidden");
        } else {
            errorEl.classList.add("hidden");
        }
    }

    function updateProcessButtonState() {
        const hasError = !pageRangeError.classList.contains("hidden") || !excludePagesError.classList.contains("hidden");
        processPdfBtn.disabled = hasError;
        processPdfBtn.classList.toggle("opacity-50", hasError);
        processPdfBtn.classList.toggle("cursor-not-allowed", hasError);
        processPdfBtn.classList.toggle("cursor-pointer", !hasError);
    }

    function clearPresetSelection() {
        presetBtns.forEach(b => {
            b.classList.remove("bg-primary/10","border-primary","text-primary");
            b.classList.add("bg-white","border-slate-300","text-slate-500");
        });
    }

    // --------------------------------------------------
    // Accordion & UI Controls
    // --------------------------------------------------
    accordionHeaders?.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.parentElement.querySelector('.accordion-content');
            const icon = header.querySelector('svg');
            const isOpen = !content.classList.contains('hidden');

            document.querySelectorAll('.accordion-content').forEach(el => el !== content && el.classList.add('hidden'));
            document.querySelectorAll('.accordion-header svg').forEach(el => el !== icon && el.classList.remove('rotate-180'));

            if (isOpen) { content.classList.add('hidden'); icon.classList.remove('rotate-180'); }
            else { content.classList.remove('hidden'); icon.classList.add('rotate-180'); }
        });
    });

    positionBtns?.forEach(btn => {
        btn.addEventListener('click', () => {
            positionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedPosition = btn.dataset.pos;
        });
    });

    rotButtons?.forEach(btn => {
        btn.addEventListener('click', () => {
            rotButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRotation = parseInt(btn.dataset.rotate) || 0;
        });
    });

    [offsetXInput, offsetYInput].forEach(input => {
        input.addEventListener('input', () => {
            offsets.x = parseInt(offsetXInput.value) || 0;
            offsets.y = parseInt(offsetYInput.value) || 0;
        });
    });

    numberFormat?.addEventListener('change', () => {
        if (numberFormat.value === 'custom') {
            customFormatContainer.classList.remove('hidden');
        } else {
            customFormatContainer.classList.add('hidden');
        }
    });

    textColor?.addEventListener('input', () => {
        const color = textColor.value;
        textColorPreview.style.backgroundColor = color;
        textColorHex.textContent = color.toUpperCase();
    });

    pageRange.addEventListener('blur', () => {
        const value = pageRange.value.trim();
        if (!value) {
            pageRange.value = 'all';
        }
    });

    pageRange.addEventListener("input", () => {
        clearPresetSelection();
        const total = pdfViewer.querySelectorAll('canvas').length;
        const { warnings } = parsePageRange(pageRange.value, '', total);
        handleWarnings(warnings, pageRangeError);
        updateProcessButtonState();
    });

    excludePages.addEventListener("input", () => {
        clearPresetSelection();
        const total = pdfViewer.querySelectorAll('canvas').length;
        const { warnings } = parsePageRange('', excludePages.value, total);
        handleWarnings(warnings, excludePagesError);
        updateProcessButtonState();
    });

    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            presetBtns.forEach(b => {
                b.classList.remove("bg-primary/10","border-primary","text-primary");
                b.classList.add("bg-white","border-slate-300","text-slate-500");
            });
            btn.classList.remove("bg-white","border-slate-300","text-slate-500");
            btn.classList.add("bg-primary/10","border-primary","text-primary");
            const type = btn.dataset.type;

            switch (type) {
                case "all":
                    pageRange.value = "all";
                    excludePages.value = "";
                    break;

                case "skip-first":
                    pageRange.value = "";
                    excludePages.value = "1";
                    break;

                case "even":
                    pageRange.value = "even";
                    excludePages.value = "";
                    break;

                case "odd":
                    pageRange.value = "odd";
                    excludePages.value = "";
                    break;

                case "clear":
                    pageRange.value = "";
                    excludePages.value = "";
                    break;
            }

            pageRangeError.classList.add("hidden");
            excludePagesError.classList.add("hidden");
        });
    });

    // --------------------------------------------------
    // Drag & Drop / File Upload
    // --------------------------------------------------
    setupDragDrop(uploadArea, {
        onFilesDropped: (files) => {
            if (files.length > 1) { alert("Only one file allowed"); return; }
            handleFileWrapper(files[0]);
        }
    })

    async function handleFileWrapper(file) {
        uploadErrorMessage.classList.add("hidden");

        const result = await handlePdfFile(file, {
            maxSizeMB: MAX_FILE_SIZE,
            largeFileMB: LARGE_FILE_THRESHOLD,
            showError: msg => {
                uploadErrorMessage.textContent = msg;
                uploadErrorMessage.classList.remove("hidden");
            },
            showWarning: msg => {
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
            totalPageDisplay: previewTotalPages,
            observer: pdfObserver,
            updateNavUI: updateNavUI
        });

        const canvases = pdfViewer.querySelectorAll('canvas');
        if (canvases.length > 0) {
            pdfObserver = new IntersectionObserver(entries => {
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
        currentPageNum.textContent = index + 1;
        prevPageBtn?.classList.toggle("hidden", index <= 0);
        nextPageBtn?.classList.toggle("hidden", index >= total - 1);
    };

    nextPageBtn?.addEventListener("click", () => {
        const canvases = pdfViewer.querySelectorAll('canvas');
        if (currentPageIndex < canvases.length - 1) canvases[currentPageIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    prevPageBtn?.addEventListener("click", () => {
        const canvases = pdfViewer.querySelectorAll('canvas');
        if (currentPageIndex > 0) canvases[currentPageIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // --------------------------------------------------
    // Process PDF
    // --------------------------------------------------
    processPdfBtn?.addEventListener("click", async () => {
        if (!pdfArrayBuffer || !originalPdfFile) return;

        filePreviewArea.classList.add("hidden");
        processingState.classList.remove("hidden");
        processingState.scrollIntoView({ behavior: "smooth", block: "center" });

        try {
            const freshBuffer = await originalPdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(freshBuffer);
            const pages = pdfDoc.getPages();
            const totalPages = pages.length;

            console.log("page range", pageRange.value);
            console.log("exclude pages", excludePages.value);
            console.log("total pages", totalPages);
            const { pages: targetPages, warnings } = parsePageRange(pageRange.value, excludePages.value, totalPages);
            console.log(targetPages);
            if (warnings.length > 0) {
                pageRangeError.textContent = warnings[0];
                pageRangeError.classList.remove("hidden");
                return;
            }

            const startFrom = parseInt(startNumber.value || 1);
            const fontSizeValue = parseFloat(fontSize.value || 12);
            const color = hexToRgb(textColor.value || '#000000');

            let font;
            switch (fontFamily.value) {
                case 'Times-Roman': font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
                                    break;
                case 'Courier': font = await pdfDoc.embedFont(StandardFonts.Courier);
                                break;
                default: font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }

            let pageNumber = startFrom;
            for (let i = 0; i < pages.length; i++) {
                progressText.innerText = `Processing page ${i + 1} of ${totalPages}`;

                if (!targetPages.includes(i + 1)) continue;

                const page = pages[i];

                let pos = selectedPosition;
                if (mirrorOddEven.checked && (i % 2 !== 0)) {
                    const mirrorMap = {
                        tl: 'tr',
                        tr: 'tl',
                        bl: 'br',
                        br: 'bl',
                        tc: 'tc',
                        bc: 'bc'
                    };
                    pos = mirrorMap[pos] || pos;
                }

                const { width, height } = page.getSize();

                const text = formatText(numberFormat.value, customFormatInput.value, pageNumber, totalPages);
                const textWidth = font.widthOfTextAtSize(text, fontSizeValue);

                const { x, y } = getPosition(pos, width, height, textWidth, fontSizeValue, offsets.x, offsets.y);

                page.drawText(text, { x, y, size: fontSizeValue, font, color, rotate: degrees(selectedRotation), opacity: layerBehind.checked ? 0.3 : 1 });

                pageNumber++;
            }

            const pdfBytes = await pdfDoc.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch(err) {
            console.error("Processing Error:", err);
            alert("Error processing PDF");
            processingState.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");
        }
    });

    // --------------------------------------------------
    // Download
    // --------------------------------------------------
    downloadBtn.addEventListener("click", () => {
        if(!processedPdfBlob) return;
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
        filenameDisplay.textContent = "";
        filesizeDisplay.textContent = "";
        pdfViewer.innerHTML = "";
        pdfViewer.scrollTop = 0;
        previewLoader.classList.add("hidden");

        uploadArea.classList.remove("hidden");
        filePreviewArea.classList.add("hidden");
        resultsArea.classList.add("hidden");
        processingState.classList.add("hidden");
        uploadErrorMessage.classList.add("hidden");
        warningMessage.classList.add("hidden");

        accordionHeaders.forEach((header, index) => {
            const content = header.parentElement.querySelector('.accordion-content');
            const icon = header.querySelector('svg');
            if(index === 0) {
                content.classList.remove('hidden');
                icon.classList.add('rotate-180');
            } else {
                content.classList.add('hidden');
                icon.classList.remove('rotate-180');
            }
        });

        positionBtns.forEach(btn => btn.classList.remove('active'));
        const defaultPosBtn = positionBtns.find(btn => btn.dataset.pos === 'bc');
        if (defaultPosBtn) defaultPosBtn.classList.add('active');
        selectedPosition = 'bc';
        offsetXInput.value = '30';
        offsetYInput.value = '30';
        offsets.x = 30;
        offsets.y = 30;
        mirrorOddEven.checked = false;
        layerBehind.checked = false;
        rotButtons.forEach(btn => btn.classList.remove('active'));
        const defaultRotBtn = rotButtons.find(btn => btn.dataset.rotate === '0');
        if (defaultRotBtn) defaultRotBtn.classList.add('active');
        selectedRotation = 0;

        numberFormat.value = 'single';
        customFormatContainer.classList.add('hidden');
        customFormatInput.value = '';
        fontFamily.value = 'Helvetica';
        fontSize.value = '12';
        textColor.value = '#000000';
        textColorPreview.style.backgroundColor = '#000000';
        textColorHex.textContent = '#000000';
        startNumber.value = '1';

        pageRange.value = '';
        pageRangeError.classList.add("hidden");
        excludePages.value = '';
        excludePagesError.classList.add("hidden");
        updateProcessButtonState();

        currentPageNum.textContent = '1';
        previewTotalPages.textContent = '--';

        resetAccordions();
    }
});