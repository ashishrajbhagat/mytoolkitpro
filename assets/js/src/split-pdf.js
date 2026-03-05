// Wait until the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {

    // --------------------------------------------------
    // DOM Elements
    // --------------------------------------------------
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");

    const filePreviewArea = document.getElementById("file-preview-area");
    const filenameDisplay = document.getElementById("filename-display");
    const totalPagesDisplay = document.getElementById("total-pages-display");

    const rangeInput = document.getElementById("page-ranges");
    const rangeError = document.getElementById("range-error");

    const splitBtn = document.getElementById("split-action-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");

    const processingState = document.getElementById("processing-state");
    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");

    const faqButtons = document.querySelectorAll(".faq-toggle");

    // --------------------------------------------------
    // State Variables
    // --------------------------------------------------
    let pdfFile = null;
    let splitPdfBlob = null;
    let totalPages = 0;
    let originalPdfBytes = null;
    let downloadUrl = null;

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
    const MAX_ALLOWED_PAGES = 5000; 

    // --------------------------------------------------
    // Helper: Prevent Default Drag Behaviors
    // --------------------------------------------------
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () =>
            uploadArea.classList.add('border-red-700', 'bg-red-50'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () =>
            uploadArea.classList.remove('border-red-700', 'bg-red-50'), false);
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

    // --------------------------------------------------
    // File Selection Handling
    // --------------------------------------------------
    pdfInput.addEventListener("change", async (e) => {
        pdfFile = e.target.files[0];
        if (!pdfFile) return;

        uploadErrorMessage.classList.add("hidden");

        // Validate file type
        if (pdfFile.type !== "application/pdf") {
            showUploadError("❌ Only PDF files are allowed.");
            return;
        }

        // Validate file size
        if (pdfFile.size > MAX_FILE_SIZE) {
            showUploadError("❌ File size too large. Max 100MB.");
            return;
        }

        try {
            // Convert to ArrayBuffer for PDF-Lib
            originalPdfBytes = await pdfFile.arrayBuffer();

            // Load document with encryption check
            const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes, { ignoreEncryption: false });
            
            // Check for security restrictions
            // pdf-lib throws on load if encrypted, but this is a secondary check
            totalPages = pdfDoc.getPageCount();

            // Update UI
            filenameDisplay.textContent = pdfFile.name;
            totalPagesDisplay.textContent = totalPages;
            rangeInput.placeholder = `e.g. 1-3, 5, 7-${totalPages}`;
            
            uploadArea.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");

        } catch (error) {
            console.error("Load Error:", error);
            const isEncrypted = error.message.includes("encrypted") || error.message.includes("password");
            showUploadError(isEncrypted 
                ? "❌ This PDF is password protected. Please unlock it first." 
                : "❌ Could not read PDF. It may be corrupted.");
            pdfFile = null;
            originalPdfBytes = null;
        }
    });

    function showUploadError(msg) {
        uploadErrorMessage.innerHTML = msg;
        uploadErrorMessage.classList.remove("hidden");
        pdfInput.value = "";
    }

    // --------------------------------------------------
    // Range Parsing & Logic
    // --------------------------------------------------
    const isValidRangeFormat = (input) => /^(\d+(-\d+)?)(,\s*\d+(-\d+)?)*$/.test(input);

    const parsePageRanges = (input, maxPages) => {
        const pages = new Set();
        const parts = input.split(',');

        for (const part of parts) {
            const range = part.trim().split('-');
            if (range.length === 1) {
                const p = parseInt(range[0]);
                if (isNaN(p) || p < 1 || p > maxPages) throw new Error(`Page ${p || ''} is out of range.`);
                pages.add(p - 1);
            } else {
                let start = parseInt(range[0]);
                let end = parseInt(range[1]);
                if (isNaN(start) || isNaN(end)) throw new Error("Invalid range format.");
                if (start > end) [start, end] = [end, start];
                if (start < 1 || end > maxPages) throw new Error(`Range ${start}-${end} is out of range.`);
                for (let i = start; i <= end; i++) pages.add(i - 1);
            }
        }
        return Array.from(pages).sort((a, b) => a - b);
    };

    // Trigger split on Enter key
    rangeInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            splitBtn.click();
        }
    });

    rangeInput.addEventListener("input", () => rangeError.classList.add("hidden"));

    // --------------------------------------------------
    // Split Execution
    // --------------------------------------------------
    splitBtn.addEventListener("click", async () => {
        if (!pdfFile || !originalPdfBytes) return;

        const rangeText = rangeInput.value.trim();
        let selectedPages = [];

        try {
            if (!rangeText) {
                // If empty, default to extracting all pages into a new file
                selectedPages = Array.from({ length: totalPages }, (_, i) => i);
            } else {
                if (!isValidRangeFormat(rangeText)) throw new Error("Invalid format. Use: 1-3, 5");
                selectedPages = parsePageRanges(rangeText, totalPages);
            }

            if (selectedPages.length === 0) throw new Error("Please select at least one page.");
            if (selectedPages.length > MAX_ALLOWED_PAGES) throw new Error("Exceeds page limit.");

        } catch (error) {
            rangeError.innerText = error.message;
            rangeError.classList.remove("hidden");
            return;
        }

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");

            // Perform Splitting/Extraction
            const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
            const newPdf = await PDFLib.PDFDocument.create();

            const copiedPages = await newPdf.copyPages(pdfDoc, selectedPages);
            copiedPages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            splitPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("Split Error:", error);
            alert("An error occurred during processing. The file might be corrupted.");
            resetUI();
        }
    });

    // --------------------------------------------------
    // Download Logic
    // --------------------------------------------------
    downloadPdfBtn.addEventListener("click", () => {
        if (!splitPdfBlob) return;

        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        downloadUrl = URL.createObjectURL(splitPdfBlob);

        const link = document.createElement("a");
        link.href = downloadUrl;
        const baseName = pdfFile.name.replace(/\.[^/.]+$/, "");
        link.download = `${baseName}-split-mytoolkitpro.pdf`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --------------------------------------------------
    // Reset UI & Memory Cleanup
    // --------------------------------------------------
    const resetUI = () => {
        // Clear memory
        pdfFile = null;
        splitPdfBlob = null;
        totalPages = 0;
        originalPdfBytes = null;

        if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
            downloadUrl = null;
        }

        // Reset Inputs
        pdfInput.value = "";
        rangeInput.value = "";
        rangeInput.placeholder = "e.g. 1-3, 5";
        
        // Toggle Visibility
        rangeError.classList.add("hidden");
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    resetBtn.addEventListener("click", resetUI);
    removeFileBtn.addEventListener("click", resetUI);

    // --------------------------------------------------
    // FAQ Accordion
    // --------------------------------------------------
    faqButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const content = this.nextElementSibling;
            const icon = this.querySelector(".faq-icon");
            const isOpen = !content.classList.contains("hidden");

            // Toggle logic
            content.classList.toggle("hidden");
            icon.textContent = isOpen ? "+" : "-";
            this.setAttribute("aria-expanded", !isOpen);
        });
    });
});