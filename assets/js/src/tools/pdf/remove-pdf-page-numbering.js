/**
 * YantraStack - Remove PDF Page Numbering
 * Features: Adaptive Masking, Page Range Support, and Memory Optimization
 */

// Wait until DOM is fully loaded before executing script
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");
    const filePreviewArea = document.getElementById("file-preview-area");
    const filenameDisplay = document.getElementById("filename-display");
    const totalPagesDisplay = document.getElementById("total-pages-display");
    const positionSelect = document.getElementById("position-select");
    const sizeSelect = document.getElementById("size-select");
    const pageRangeInput = document.getElementById("page-range");
    const removeFileBtn = document.getElementById("remove-file-btn");
    const processBtn = document.getElementById("process-action-btn");
    const processingState = document.getElementById("processing-state");
    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");

    // State
    let pdfFile = null;
    let pdfArrayBuffer = null;
    let processedPdfBlob = null;
    let totalPages = 0;

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    // --- Utility: Parse Page Ranges (e.g., "1, 3-5") ---
    const parsePageRanges = (input, maxPages) => {
        const pages = new Set();
        const parts = input.split(',').map(p => p.trim());
        
        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.max(1, start); i <= Math.min(end, maxPages); i++) {
                        pages.add(i);
                    }
                }
            } else {
                const num = Number(part);
                if (!isNaN(num) && num >= 1 && num <= maxPages) {
                    pages.add(num);
                }
            }
        });
        return pages;
    };

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

    // --- File Selection ---
    pdfInput.addEventListener("change", async (e) => {
        pdfFile = e.target.files[0];
        if (!pdfFile) return;

        if (pdfFile.type !== "application/pdf") {
            showUploadError("❌ Only PDF files are allowed.");
            return;
        }

        if (pdfFile.size > MAX_FILE_SIZE) {
            showUploadError("❌ File too large. Max size is 100MB.");
            return;
        }

        try {
            uploadErrorMessage.classList.add("hidden");
            // Slice(0) ensures the original buffer isn't detached
            pdfArrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer.slice(0));
            
            totalPages = pdfDoc.getPageCount();
            filenameDisplay.textContent = pdfFile.name;
            totalPagesDisplay.textContent = totalPages;

            uploadArea.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");

        } catch (error) {
            console.error("Load error:", error);
            showUploadError("❌ Failed to load PDF. It might be encrypted or corrupted.");
        }
    });

    const showUploadError = (msg) => {
        uploadErrorMessage.innerText = msg;
        uploadErrorMessage.classList.remove("hidden");
        pdfInput.value = "";
    };

    // --- Process Logic ---
    processBtn.addEventListener("click", async () => {
        if (!pdfArrayBuffer) return;

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");

            // Load the document for processing
            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer.slice(0));
            const pages = pdfDoc.getPages();
            const position = positionSelect.value;
            const sizeMode = sizeSelect.value;
            const rangeText = pageRangeInput.value.trim();

            // Determine which pages to clean
            const targetPages = rangeText ? parsePageRanges(rangeText, totalPages) : null;

            // ADAPTIVE SIZING: Defines the area to "white-out"
            let rectWidth = 140; 
            let rectHeight = 45; 

            if (sizeMode === 'standard') {
                rectWidth = 100; rectHeight = 30;
            } else if (sizeMode === 'large') {
                rectWidth = 170; rectHeight = 55; // Covers "Page X of Y" comfortably
            } else if (sizeMode === 'extra') {
                rectWidth = 240; rectHeight = 85; // For very large font numbering
            }

            

            pages.forEach((page, idx) => {
                const pageNum = idx + 1;

                // Skip if a range is set and this page isn't in it
                if (targetPages && !targetPages.has(pageNum)) return;

                const { width, height } = page.getSize();
                let x, y;
                const padding = 5; // Safe distance from page edge

                // Vertical Pos
                if (position.includes('bottom')) {
                    y = padding;
                } else {
                    y = height - rectHeight - padding;
                }

                // Horizontal Pos
                if (position.includes('center')) {
                    x = (width - rectWidth) / 2;
                } else if (position.includes('left')) {
                    x = padding;
                } else {
                    x = width - rectWidth - padding;
                }

                // Draw the Opaque Mask (White Box)
                page.drawRectangle({
                    x, y,
                    width: rectWidth,
                    height: rectHeight,
                    color: PDFLib.rgb(1, 1, 1),
                    opacity: 1,
                });
            });

            const pdfBytes = await pdfDoc.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("Processing error:", error);
            alert("Error removing page numbers. Please try again.");
            resetUI();
        }
    });

    // --- UI Helpers ---
    const resetUI = () => {
        pdfFile = null;
        pdfArrayBuffer = null;
        processedPdfBlob = null;
        pdfInput.value = "";
        pageRangeInput.value = "";
        
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
        link.download = `${name}-cleaned-yantrastack.pdf`;
        link.click();
        URL.revokeObjectURL(url); // Memory cleanup
    });
});