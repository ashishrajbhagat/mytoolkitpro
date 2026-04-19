/**
 * @fileoverview YantraStack - JPG to PDF Logic
 * @description Provides high-performance image-to-PDF conversion with support for 
 * custom page sizes, stacking (ID Cards), auto-rotation, and pagination.
 * @architecture tools/image/jpg-to-pdf.html
 * @dependencies jspdf (with px_scaling hotfix), SortableJS, utils (dragDrop, fileHandler, helpers)
 * @version 1.1.0
 * @author YantraStack
 */

import { setupDragDrop } from "../../utils/dragDrop.min.js";
import { handleImageBatch } from "../../utils/fileHandler.min.js";
import { initAccordions, resetAccordions } from "../../utils/helpers.min.js";

document.addEventListener("DOMContentLoaded", () => {
    // --------------------------------------------------
    // DOM Elements
    // --------------------------------------------------
    const uploadArea = document.getElementById("upload-area");
    const imageFilesInput = document.getElementById("imageFiles");
    const uploadErrorMessage = document.getElementById("upload-error-message");
    const filePreviewArea = document.getElementById("file-preview-area");
    const sortablePreviewArea = document.getElementById("sortable-preview-area");
    
    const fileCountDisplay = document.getElementById("file-count-display");
    const totalSizeDisplay = document.getElementById("total-size-display");
    const warningMessage = document.getElementById("warning-message");

    const pageSizeSelect = document.getElementById("page-size");
    const orientationSelect = document.getElementById("orientation");
    const scalingSelect = document.getElementById("image-scaling");
    const alignSelect = document.getElementById("image-align");
    
    const marginBtns = document.querySelectorAll(".margin-btn");
    const marginDisplay = document.getElementById("margin-value-display");
    const customMarginTrigger = document.getElementById("custom-margin-trigger");
    const customMarginWrapper = document.getElementById("custom-margin-wrapper");
    const customMarginInput = document.getElementById("custom-margin-input");

    const enableNumbers = document.getElementById("enable-numbers");
    const numberingSettings = document.getElementById("numbering-settings");
    const numberPosSelect = document.getElementById("number-pos");
    const formatSelect = document.getElementById("number-format-select");
    const customFormatWrapper = document.getElementById("custom-format-wrapper");
    const customFormatInput = document.getElementById("number-format-custom");

    const qualBtns = document.querySelectorAll(".qual-btn");
    const autoRotate = document.getElementById("auto-rotate");
    const onePerPage = document.getElementById("one-per-page");
    const grayscaleToggle = document.getElementById("grayscale");

    const processBtn = document.getElementById("process-pdf-btn");
    const addMoreBtn = document.getElementById("add-more-btn");
    const clearAllBtn = document.getElementById("clear-all-btn");

    const processingState = document.getElementById("processing-state");
    const progressText = document.getElementById("progress-text");
    const cancelBtn = document.getElementById("cancel-btn")
    
    const resultsArea = document.getElementById("results-area");
    const downloadBtn = document.getElementById("download-btn");
    const resetBtn = document.getElementById("reset-btn");

    // --------------------------------------------------
    // State & Constants
    // --------------------------------------------------
    const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
    if (!jsPDF) console.error("jsPDF library not found. Ensure vendor script is loaded.");

    let imageQueue = []; 
    let selectedMargin = 0;
    let selectedQuality = 'high';
    let isProcessing = false;
    let currentBlobUrl = null;
    let sortableInstance = null;

    const MAX_BATCH_SIZE_MB = 100;
    const LARGE_BATCH_THRESHOLD_MB = 30;
    const INDIVIDUAL_FILE_MAX_MB = 50;

    // --------------------------------------------------
    // UI Controls
    // --------------------------------------------------
    resetBtn.addEventListener("click", () => { resetUI(); uploadArea.scrollIntoView({behavior:'smooth', block:'center'}); });
    clearAllBtn.addEventListener("click", () => { resetUI(); uploadArea.scrollIntoView({behavior:'smooth', block:'center'}); });
    initAccordions();

    marginBtns?.forEach(btn => {
        btn.addEventListener("click", () => {
            marginBtns.forEach(b => b.classList.remove("active", "bg-primary", "text-white"));
            btn.classList.add("active", "bg-primary", "text-white");
            
            if (btn === customMarginTrigger) {
                customMarginWrapper.classList.remove("hidden");
                selectedMargin = parseInt(customMarginInput.value) || 0;
            } else {
                customMarginWrapper.classList.add("hidden");
                selectedMargin = parseInt(btn.getAttribute("data-margin"));
            }
            marginDisplay.textContent = `${selectedMargin}px`;
        });
    });

    customMarginInput?.addEventListener("input", (e) => {
        selectedMargin = parseInt(e.target.value) || 0;
        marginDisplay.textContent = `${selectedMargin}px`;
    });

    enableNumbers?.addEventListener('change', () => {
        numberingSettings.classList.toggle('hidden', !enableNumbers.checked);
    });

    formatSelect?.addEventListener('change', () => {
        customFormatWrapper.classList.toggle('hidden', formatSelect.value !== 'custom');
    });

    qualBtns?.forEach(btn => {
        btn.addEventListener("click", () => {
            qualBtns.forEach(b => b.classList.remove("active", "bg-primary", "text-white"));
            btn.classList.add("active", "bg-primary", "text-white");
            selectedQuality = btn.getAttribute("data-qual");
        });
    });

    addMoreBtn.addEventListener("click", () => {
        imageFilesInput.click();
    });

    cancelBtn.addEventListener("click", () => {
        isProcessing = false;
        resetUI();
    });

    // --------------------------------------------------
    // File Handling
    // --------------------------------------------------
    setupDragDrop(uploadArea, {
        onFilesDropped: (files) => handleFiles(Array.from(files))
    });

    imageFilesInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            handleFiles(files);
            e.target.value = ""; 
        }
    });

    async function handleFiles(files) {
        uploadErrorMessage?.classList.add("hidden");
        warningMessage?.classList.add("hidden");
        if (warningMessage) warningMessage.textContent = "";

        const batch = await handleImageBatch(files, {
            maxBatchSizeMB: MAX_BATCH_SIZE_MB,
            largeBatchThresholdMB: LARGE_BATCH_THRESHOLD_MB,
            individualMaxSizeMB: INDIVIDUAL_FILE_MAX_MB
        });

        if (batch.exceedsBatchLimit) {
            if (uploadErrorMessage) {
                uploadErrorMessage.textContent = `❌ Total batch exceeds ${MAX_BATCH_SIZE_MB}MB.`;
                uploadErrorMessage.classList.remove("hidden");
            }
            return;
        }

        batch.valid.forEach(res => {
            const id = Math.random().toString(36).substr(2, 9);
            imageQueue.push({ 
                id, 
                file: res.file, 
                dataUrl: res.dataUrl, 
                name: res.meta.name, 
                size: res.file.size 
            });
            renderThumbnail(id, res.dataUrl, res.meta.name);
        });

        if (batch.skippedCount > 0) {
            const msg = `⚠️ Skipped ${batch.skippedCount} invalid or large file(s).`;
            
            if (imageQueue.length > 0 && warningMessage) {
                warningMessage.textContent = msg;
                warningMessage.classList.remove("hidden");
            } else if (uploadErrorMessage) {
                uploadErrorMessage.textContent = msg;
                uploadErrorMessage.classList.remove("hidden");
            }
        } 
        else if (batch.isLargeBatch && warningMessage?.classList.contains('hidden')) {
            warningMessage.textContent = `⚠️ Large batch (${batch.totalSizeMB.toFixed(1)}MB). Processing may take a moment.`;
            warningMessage.classList.remove("hidden");
        }

        if (imageQueue.length > 0) {
            uploadArea?.classList.add("hidden");
            filePreviewArea?.classList.remove("hidden");
            updateBatchInfo();
        }

        initReordering();
    }

    function initReordering() {
        if (sortableInstance) {
            sortableInstance.destroy();
        }

        if (typeof Sortable !== 'undefined') {
            sortableInstance = new Sortable(sortablePreviewArea, {
                animation: 150,
                ghostClass: 'bg-primary/5',
                onEnd: () => {
                    const newOrderIds = Array.from(sortablePreviewArea.children).map(el => el.getAttribute('data-id'));
                    imageQueue.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                }
            });
        }
    }

    function renderThumbnail(id, src, name) {
        const div = document.createElement('div');
        div.className = "relative group aspect-square bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm cursor-move";
        div.setAttribute('data-id', id);
        div.innerHTML = `
            <img src="${src}" class="w-full h-full object-cover rounded-lg" alt="${name}" />
            <button class="absolute -top-2 -right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg remove-img cursor-pointer" aria-label="Remove Image">✕</button>
            <div class="absolute bottom-1 left-1 bg-slate-900/60 text-[8px] text-white px-1.5 py-0.5 rounded backdrop-blur-sm truncate max-w-[80%]">${name}</div>
        `;
        sortablePreviewArea.appendChild(div);

        div.querySelector('.remove-img').addEventListener('click', (e) => {
            e.stopPropagation();
            imageQueue = imageQueue.filter(img => img.id !== id);
            div.remove();
            updateBatchInfo();
            if (imageQueue.length === 0) resetUI();
        });
    }

    function updateBatchInfo() {
        if (!fileCountDisplay || !totalSizeDisplay) return;

        fileCountDisplay.textContent = `${imageQueue.length} Images Selected`;
        
        const totalBytes = imageQueue.reduce((acc, img) => acc + img.size, 0);
        const totalSizeMB = totalBytes / (1024 * 1024);
        totalSizeDisplay.textContent = totalSizeMB.toFixed(2) + " MB";

        if (warningMessage) {
            if (totalSizeMB > LARGE_BATCH_THRESHOLD_MB) {
                if (!warningMessage.textContent.includes("Skipped")) {
                    warningMessage.textContent = `⚠️ Large batch detected (${totalSizeMB.toFixed(1)} MB). Processing may take longer.`;
                    warningMessage.classList.remove("hidden");
                }
            } else {
                if (warningMessage.textContent.includes("Large batch")) {
                    warningMessage.classList.add("hidden");
                    warningMessage.textContent = "";
                }
            }
        }
    }

    // --------------------------------------------------
    // PDF Generation Logic
    // --------------------------------------------------
    processBtn.addEventListener("click", async () => {
        if (imageQueue.length === 0 || isProcessing) return;
        isProcessing = true;

        filePreviewArea.classList.add("hidden");
        processingState.classList.remove("hidden");
        processingState.scrollIntoView({ behavior: "smooth", block: "center" });

        try {
            const pdf = new jsPDF({
                orientation: orientationSelect.value === 'auto' ? 'p' : orientationSelect.value,
                unit: 'px',
                hotfixes: ["px_scaling"],
                compress: selectedQuality === 'low'
            });

            pdf.deletePage(1);

            const onePageOnly = !onePerPage.checked;
            for (let i = 0; i < imageQueue.length; i++) {
                if (!isProcessing) return;

                const imgData = imageQueue[i];
                let imgProps = pdf.getImageProperties(imgData.dataUrl);
                progressText.textContent = `Processing Image ${i + 1} of ${imageQueue.length}...`;

                let pWidth, pHeight;
                if (pageSizeSelect.value === 'fit') {
                    pWidth = imgProps.width + (selectedMargin * 2);
                    pHeight = imgProps.height + (selectedMargin * 2);
                } else {
                    const sizes = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008] };
                    [pWidth, pHeight] = sizes[pageSizeSelect.value];
                    
                    if (autoRotate.checked) {
                        const isImgLandscape = imgProps.width > imgProps.height;
                        const isPagePortrait = pHeight > pWidth;
                        if (isImgLandscape && isPagePortrait) [pWidth, pHeight] = [pHeight, pWidth];
                        else if (!isImgLandscape && !isPagePortrait) [pWidth, pHeight] = [pHeight, pWidth];
                    }
                }

                const isTopHalf = (i % 2 === 0);
                if (!onePageOnly || isTopHalf) {
                    pdf.addPage([pWidth, pHeight]);
                }

                const internalW = pdf.internal.pageSize.getWidth();
                const internalH = pdf.internal.pageSize.getHeight();

                const containerW = internalW - (selectedMargin * 2);
                const containerH = onePageOnly ? (internalH / 2) - (selectedMargin * 1.5) : internalH - (selectedMargin * 2);

                let drawW, drawH;
                if (scalingSelect.value === 'none') {
                    drawW = imgProps.width;
                    drawH = imgProps.height;
                } else {
                    const ratio = scalingSelect.value === 'fill' 
                        ? Math.max(containerW / imgProps.width, containerH / imgProps.height)
                        : Math.min(containerW / imgProps.width, containerH / imgProps.height);
                    drawW = imgProps.width * ratio;
                    drawH = imgProps.height * ratio;
                }

                let x = selectedMargin + (containerW - drawW) / 2;
                let y;
                const virtualYStart = (onePageOnly && !isTopHalf) ? (internalH / 2) : 0;

                if (alignSelect.value === 'center') {
                    y = virtualYStart + selectedMargin + (containerH - drawH) / 2;
                } else if (alignSelect.value === 'top') {
                    y = virtualYStart + selectedMargin;
                } else {
                    const currentBoxHeight = onePageOnly ? (internalH / 2) : internalH;
                    y = virtualYStart + currentBoxHeight - selectedMargin - drawH;
                }

                const compression = selectedQuality === 'high' ? 'NONE' : 'FAST';
                pdf.addImage(imgData.dataUrl, 'JPEG', x, y, drawW, drawH, undefined, compression, 0);

                if (enableNumbers.checked) {
                    const actualPageNum = onePageOnly ? Math.floor(i / 2) + 1 : i + 1;
                    const totalPages = onePageOnly ? Math.ceil(imageQueue.length / 2) : imageQueue.length;

                    const isLastImage = (i === imageQueue.length - 1);
                    const isSecondInPair = (i % 2 === 1);

                    if (!onePageOnly || isSecondInPair || isLastImage) {
                        const pattern = (formatSelect.value === 'custom') ? customFormatInput.value : formatSelect.value;
                        const pageText = pattern.replace(/{n}/g, actualPageNum).replace(/{total}/g, totalPages);

                        pdf.setFontSize(10);
                        pdf.setTextColor(0, 0, 0);
                        
                        const pos = numberPosSelect.value;
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const padding = Math.max(20, selectedMargin);

                        let tx = pageWidth / 2;
                        let ty = pageHeight - padding;
                        let tAlign = 'center';

                        if (pos.includes('left')) { tx = padding; tAlign = 'left'; }
                        else if (pos.includes('right')) { tx = pageWidth - padding; tAlign = 'right'; }
                        if (pos.includes('top')) ty = padding + 10;

                        pdf.text(pageText, tx, ty, { align: tAlign });
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 10));
            }

            progressText.textContent = "Finalizing PDF...";

            if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
            const pdfBlob = pdf.output('blob');
            currentBlobUrl = URL.createObjectURL(pdfBlob);

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("PDF Error:", error);
            resetUI();
        } finally {
            isProcessing = false;
        }
    });

    // --------------------------------------------------
    // Download
    // --------------------------------------------------
    downloadBtn.addEventListener("click", () => {
        if (!currentBlobUrl) return;
        
        const link = document.createElement('a');
        link.href = currentBlobUrl;
        link.download = `yantrastack-converted.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --------------------------------------------------
    // Reset
    // --------------------------------------------------
    function resetUI() {
        imageQueue = [];
        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
            currentBlobUrl = null;
        }

        sortablePreviewArea.innerHTML = '';
        imageFilesInput.value = '';
        uploadErrorMessage.classList.add("hidden");
        uploadErrorMessage.textContent = '';
        warningMessage.classList.add("hidden");
        warningMessage.textContent = '';
        uploadArea.classList.remove("hidden");
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        progressText.textContent = "";
        pageSizeSelect.value = 'fit';
        orientationSelect.value = 'auto';
        scalingSelect.value = 'fit';
        alignSelect.value = 'center';
        marginBtns.forEach(b => b.classList.remove("active", "bg-primary", "text-white"));
        marginBtns[0].classList.add("active", "bg-primary", "text-white");
        selectedMargin = 0;
        marginDisplay.textContent = '0px';
        customMarginWrapper.classList.add("hidden");
        customMarginInput.value = '30';
        enableNumbers.checked = false;
        numberingSettings.classList.add("hidden");
        numberPosSelect.value = 'bottom-center';
        formatSelect.value = '{n}';
        grayscaleToggle.checked = false;
        onePerPage.checked = true;
        autoRotate.checked = true;
        qualBtns.forEach(b => b.classList.remove("active", "bg-primary", "text-white"));
        qualBtns[0].classList.add("active", "bg-primary", "text-white");
        selectedQuality = 'high';

        resetAccordions();
    }
});