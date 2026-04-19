/**
 * MyToolKitPro - Add Watermark to PDF Logic
 * Dependencies: pdf-lib
 */

// Wait until DOM is fully loaded before executing script
document.addEventListener("DOMContentLoaded", () => {
    // --------------------------------------------------
    // DOM Elements
    // --------------------------------------------------
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");

    const filePreviewArea = document.getElementById("file-preview-area");
    const filenameDisplay = document.getElementById("filename-display");
    const filesizeDisplay = document.getElementById("filesize-display");

    // Form Inputs
    const watermarkTextInput = document.getElementById("watermark-text");
    const sizeInput = document.getElementById("wm-size");
    const opacityInput = document.getElementById("wm-opacity");
    const rotationInput = document.getElementById("wm-rotation");
    const positionSelect = document.getElementById("wm-position");
    const colorInput = document.getElementById("wm-color");
    const colorPreview = document.getElementById("wm-color-preview");
    const colorHexText = document.getElementById("wm-color-hex");
    const layer = document.getElementById("wm-layer").value;

    const addWatermarkBtn = document.getElementById("add-watermark-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");

    const processingState = document.getElementById("processing-state");
    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");

    // Helper: Convert Hex Color to PDF-Lib RGB (0-1 scale)
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return PDFLib.rgb(r, g, b);
    };

    // Helper: Format Bytes to KB/MB
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Sync Hex text display
    colorInput.addEventListener("input", (e) => {
        colorHexText.textContent = e.target.value.toUpperCase();
    });

    // --------------------------------------------------
    // State Variables
    // --------------------------------------------------
    let pdfFile = null;
    let watermarkedPdfBlob = null;
    let originalPdfBytes = null;
    let downloadUrl = null;

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const TEXT_LIMIT = 50;

    // --------------------------------------------------
    // Utility Functions
    // --------------------------------------------------
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // --------------------------------------------------
    // Drag & Drop Handling
    // --------------------------------------------------
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

    colorInput.addEventListener("input", (e) => {
        const selectedColor = e.target.value.toUpperCase();
        colorPreview.style.backgroundColor = selectedColor;
        colorHexText.textContent = selectedColor;
    });

    // --------------------------------------------------
    // File Selection Logic
    // --------------------------------------------------
    pdfInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadErrorMessage.classList.add("hidden");

        if (file.type !== "application/pdf") {
            showUploadError("❌ Only PDF files are allowed.");
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            showUploadError("❌ File size too large. Max 100MB.");
            return;
        }

        try {
            const bytes = await file.arrayBuffer();
            // Test load to check for validity and encryption
            await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false });

            pdfFile = file;
            originalPdfBytes = bytes;

            filenameDisplay.textContent = file.name;
            filesizeDisplay.textContent = formatBytes(file.size);
            uploadArea.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");

        } catch (error) {
            console.error("Load Error:", error);
            const isEncrypted = error.message.includes("encrypted") || error.message.includes("password");
            showUploadError(isEncrypted 
                ? "❌ This PDF is password protected. Please unlock it first." 
                : "❌ Could not read PDF. It may be corrupted or restricted.");
            resetState();
        }
    });

    function showUploadError(msg) {
        uploadErrorMessage.innerHTML = msg;
        uploadErrorMessage.classList.remove("hidden");
        pdfInput.value = "";
    }

    // --------------------------------------------------
    // Watermark Processing
    // --------------------------------------------------
    addWatermarkBtn.addEventListener("click", async () => {
        if (!originalPdfBytes) return;

        try {
            // UI Transition
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");

            // Sanitize and Clamp Inputs
            const text = watermarkTextInput.value.trim().substring(0, TEXT_LIMIT) || "DRAFT";
            const fontSize = clamp(parseInt(sizeInput.value) || 60, 10, 300);
            const opacity = clamp(parseFloat(opacityInput.value) / 100 || 0.5, 0.05, 1);
            const rotation = clamp(parseInt(rotationInput.value) || 0, -360, 360);
            const position = positionSelect ? positionSelect.value : "center";

            // Process Document
            const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
            const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
            const pages = pdfDoc.getPages();

            pages.forEach((page) => {
                const { width, height } = page.getSize();
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const textHeight = fontSize; // Approximate

                // Calculate Placement
                let x = (width - textWidth) / 2;
                let y = (height - textHeight) / 2; // Default Center

                if (position === "top") y = height - (fontSize * 2.5);
                if (position === "bottom") y = fontSize * 1.5;

                page.drawText(text, {
                    x: x,
                    y: y,
                    size: fontSize,
                    font: font,
                    color: hexToRgb(colorInput.value),
                    opacity: opacity,
                    rotate: PDFLib.degrees(rotation),
                    prepend: layer === "under"
                });
            });

            const pdfBytes = await pdfDoc.save();
            watermarkedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("Processing Error:", error);
            alert("An error occurred during processing. Some PDFs have internal restrictions preventing modification.");
            resetUI();
        }
    });

    // --------------------------------------------------
    // Download & Cleanup
    // --------------------------------------------------
    downloadPdfBtn.addEventListener("click", () => {
        if (!watermarkedPdfBlob) return;

        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        downloadUrl = URL.createObjectURL(watermarkedPdfBlob);

        const link = document.createElement("a");
        link.href = downloadUrl;
        const baseName = pdfFile.name.replace(/\.[^/.]+$/, "");
        link.download = `${baseName}-watermarked-mytoolkitpro.pdf`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    const resetState = () => {
        pdfFile = null;
        originalPdfBytes = null;
        watermarkedPdfBlob = null;
        if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
            downloadUrl = null;
        }
    };

    const resetUI = () => {
        resetState();
        pdfInput.value = "";
        
        // Form Resets
        watermarkTextInput.value = "DRAFT";
        sizeInput.value = "80";
        opacityInput.value = "50";
        rotationInput.value = "-45";

        // Section Resets
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    resetBtn.addEventListener("click", resetUI);
    removeFileBtn.addEventListener("click", resetUI);
});