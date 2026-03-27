/**
 * MyToolKitPro - Add Page Numbers to PDF Logic
 * Dependencies: pdf-lib
 */

// Wait until the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");
    const filePreviewArea = document.getElementById("file-preview-area");
    const filenameDisplay = document.getElementById("filename-display");
    const totalPagesDisplay = document.getElementById("total-pages-display");
    const positionSelect = document.getElementById("position-select");
    const formatSelect = document.getElementById("format-select");
    const customFormatInput = document.getElementById("custom-format-input");
    const sizeSelect = document.getElementById("size-select");
    const startNumberInput = document.getElementById("start-number");
    const marginInput = document.getElementById("margin-input");
    const fontSelect = document.getElementById("font-select");
    const skipFirstPageCheckbox = document.getElementById("skip-first-page");
    const skipPagesInput = document.getElementById("skip-pages-input");
    const ignoreSkippedInCountCheckbox = document.getElementById("ignore-skipped-in-count");
    const processBtn = document.getElementById("process-action-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");
    const processingState = document.getElementById("processing-state");
    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");
    const faqButtons = document.querySelectorAll(".faq-toggle");

    // State
    let pdfFile = null;
    let processedPdfBlob = null;
    let totalPages = 0;
    let pdfArrayBuffer = null;

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    // --- Drag and Drop Logic ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
        uploadArea.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(name => {
        uploadArea.addEventListener(name, () => uploadArea.classList.add('border-primary', 'bg-red-50'), false);
    });

    ['dragleave', 'drop'].forEach(name => {
        uploadArea.addEventListener(name, () => uploadArea.classList.remove('border-primary', 'bg-red-50'), false);
    });

    uploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            pdfInput.files = files;
            pdfInput.dispatchEvent(new Event('change'));
        }
    }, false);

    // Handle keyboard navigation for upload area
    uploadArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pdfInput.click();
        }
    });

    // Toggle custom format input
    formatSelect.addEventListener("change", () => {
        if (formatSelect.value === "custom") {
            customFormatInput.classList.remove("hidden");
        } else {
            customFormatInput.classList.add("hidden");
        }
    });

    // --- File Selection ---
    pdfInput.addEventListener("change", async (e) => {
        pdfFile = e.target.files[0];
        if (!pdfFile) return;

        if (pdfFile.type !== "application/pdf") {
            showError("❌ Invalid file type. Please select a PDF.");
            return;
        }

        if (pdfFile.size > MAX_FILE_SIZE) {
            showError("❌ File too large. Max size is 100MB.");
            return;
        }

        try {
            pdfArrayBuffer = await pdfFile.arrayBuffer();
            // Test load to check for encryption
            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: false });
            totalPages = pdfDoc.getPageCount();
            
            uploadErrorMessage.classList.add("hidden");
            filenameDisplay.textContent = pdfFile.name;
            totalPagesDisplay.textContent = totalPages;
            uploadArea.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");
        } catch (error) {
            console.error("Load error:", error);
            const msg = error.message.toLowerCase().includes("encrypted") 
                ? "❌ This PDF is password protected. Please unlock it first." 
                : "❌ Failed to read PDF. The file might be corrupted.";
            showError(msg);
        }
    });

    function showError(msg) {
        uploadErrorMessage.innerHTML = msg;
        uploadErrorMessage.classList.remove("hidden");
        pdfFile = null;
        pdfInput.value = "";
    }

    // --- Core Logic: Add Numbers ---
    processBtn.addEventListener("click", async () => {
        if (!pdfArrayBuffer) return;

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");

            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer);
            
            // Embed selected font
            const fontName = fontSelect.value;
            let font;
            if (fontName === 'TimesRoman') font = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
            else if (fontName === 'Courier') font = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier);
            else font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

            const pages = pdfDoc.getPages();
            const position = positionSelect.value;
            const format = formatSelect.value;
            const textSize = parseInt(sizeSelect.value) || 12;
            const startNum = parseInt(startNumberInput.value) || 1;
            const margin = parseInt(marginInput.value) || 20;
            const ignoreSkipped = ignoreSkippedInCountCheckbox.checked;

            // Parse skipped pages
            const skippedPages = new Set();
            if (skipFirstPageCheckbox.checked) skippedPages.add(1);

            const skipText = skipPagesInput.value.trim();
            if (skipText) {
                const parts = skipText.split(',');
                for (const part of parts) {
                    const range = part.trim().split('-');
                    if (range.length === 1) {
                        const p = parseInt(range[0]);
                        if (!isNaN(p)) skippedPages.add(p);
                    } else if (range.length === 2) {
                        let start = parseInt(range[0]);
                        let end = parseInt(range[1]);
                        if (!isNaN(start) && !isNaN(end)) {
                            if (start > end) [start, end] = [end, start];
                            for (let i = start; i <= end; i++) skippedPages.add(i);
                        }
                    }
                }
            }

            // Calculate effective total pages
            let total = pages.length;
            if (ignoreSkipped) {
                let skippedCount = 0;
                for (let i = 1; i <= pages.length; i++) {
                    if (skippedPages.has(i)) skippedCount++;
                }
                total = pages.length - skippedCount;
            }

            let visualPageNum = startNum;

            pages.forEach((page, idx) => {
                const isSkipped = skippedPages.has(idx + 1);

                if (isSkipped) {
                    if (!ignoreSkipped) {
                        visualPageNum++;
                    }
                    return;
                }

                const num = visualPageNum;
                visualPageNum++;

                let text = "";
                
                if (format === 'n') text = `${num}`;
                else if (format === 'page-n') text = `Page ${num}`;
                else if (format === 'n-of-total') text = `${num} of ${total}`;
                else if (format === 'custom') {
                    text = customFormatInput.value
                        .replace(/{n}/g, num)
                        .replace(/{total}/g, total);
                }

                const textWidth = font.widthOfTextAtSize(text, textSize);
                const { width, height } = page.getSize();
                
                let x, y;
                // Vertical Calc
                if (position.startsWith('top')) {
                    y = height - margin;
                } else {
                    y = margin;
                }

                // Horizontal Calc
                if (position.endsWith('left')) {
                    x = margin;
                } else if (position.endsWith('right')) {
                    x = width - margin - textWidth;
                } else {
                    x = (width - textWidth) / 2;
                }

                page.drawText(text, {
                    x, y, size: textSize, font,
                    color: PDFLib.rgb(0, 0, 0),
                    opacity: 0.7
                });
            });

            const pdfBytes = await pdfDoc.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (error) {
            console.error("Processing error:", error);
            alert("Error adding page numbers. Please try again.");
            resetUI();
        }
    });

    // --- UI Helpers ---
    const resetUI = () => {
        pdfFile = null;
        processedPdfBlob = null;
        pdfArrayBuffer = null;
        pdfInput.value = "";
        startNumberInput.value = "1";
        sizeSelect.value = "12";
        marginInput.value = "20";
        fontSelect.value = "Helvetica";
        skipFirstPageCheckbox.checked = false;
        skipPagesInput.value = "";
        ignoreSkippedInCountCheckbox.checked = false;
        formatSelect.value = "n";
        customFormatInput.value = "";
        customFormatInput.classList.add("hidden");
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");
    };

    resetBtn.addEventListener("click", resetUI);
    removeFileBtn.addEventListener("click", resetUI);

    downloadPdfBtn.addEventListener("click", () => {
        if (!processedPdfBlob) return;
        const url = URL.createObjectURL(processedPdfBlob);
        const link = document.createElement("a");
        link.href = url;
        const name = pdfFile ? pdfFile.name.replace(".pdf", "") : "document";
        link.download = `${name}-numbered-mytoolkitpro.pdf`;
        link.click();
        URL.revokeObjectURL(url); // Clean up memory
    });

    // FAQ
    faqButtons.forEach(btn => {
        btn.addEventListener("click", function() {
            const content = this.nextElementSibling;
            const icon = this.querySelector(".faq-icon");
            content.classList.toggle("hidden");
            icon.textContent = content.classList.contains("hidden") ? "+" : "-";
        });
    });
});
