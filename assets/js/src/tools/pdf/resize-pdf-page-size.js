/**
 * MyToolKitPro - Resize PDF Page Size Logic
 * Features: Smart Scaling, Auto-Centering, Orientation Toggle, and Range Support
 */

// Wait until DOM is fully loaded before executing script
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");
    const filePreviewArea = document.getElementById("file-preview-area");
    const filenameDisplay = document.getElementById("filename-display");
    const filesizeDisplay = document.getElementById("filesize-display");
    const totalPagesDisplay = document.getElementById("total-pages-display");
    const sizePreset = document.getElementById("size-preset");
    const customDims = document.getElementById("custom-dims");
    const portraitBtn = document.getElementById('portrait-btn');
    const landscapeBtn = document.getElementById('landscape-btn');
    const processBtn = document.getElementById("process-action-btn");
    const processingState = document.getElementById("processing-state");
    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");

    // State
    let pdfFile = null;
    let pdfArrayBuffer = null;
    let processedPdfBlob = null;
    let selectedOrientation = 'portrait';
    let totalPages = 0;

    const PRESETS = {
        'A4': [595.28, 841.89],
        'Letter': [612, 792],
        'Legal': [612, 1008],
        'A3': [841.89, 1190.55]
    };

    // --- Orientation Toggle Logic ---
    const toggleOrientation = (mode) => {
        selectedOrientation = mode;
        const activeClasses = ['bg-white', 'shadow-sm', 'text-primary', 'font-bold'];
        const inactiveClasses = ['text-gray-500', 'font-medium', "hover:text-gray-700"];

        if (mode === 'portrait') {
            portraitBtn.classList.add(...activeClasses);
            portraitBtn.classList.remove(...inactiveClasses);
            portraitBtn.setAttribute('aria-pressed', 'true');
            landscapeBtn.classList.remove(...activeClasses);
            landscapeBtn.classList.add(...inactiveClasses);
            landscapeBtn.setAttribute('aria-pressed', 'false');
        } else {
            landscapeBtn.classList.add(...activeClasses);
            landscapeBtn.classList.remove(...inactiveClasses);
            landscapeBtn.setAttribute('aria-pressed', 'true');
            portraitBtn.classList.remove(...activeClasses);
            portraitBtn.classList.add(...inactiveClasses);
            portraitBtn.setAttribute('aria-pressed', 'false');
        }
    };

    portraitBtn.addEventListener('click', () => toggleOrientation('portrait'));
    landscapeBtn.addEventListener('click', () => toggleOrientation('landscape'));

    sizePreset.addEventListener('change', () => {
        customDims.classList.toggle('hidden', sizePreset.value !== 'custom');
    });

    // --- File Handling ---
    pdfInput.addEventListener("change", async (e) => {
        pdfFile = e.target.files[0];
        if (!pdfFile || pdfFile.type !== "application/pdf") {
            showError("❌ Please select a valid PDF file.");
            return;
        }

        try {
            uploadErrorMessage.classList.add("hidden");
            // Slice buffer to prevent detachment during loading
            pdfArrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer.slice(0), { ignoreEncryption: false });
            
            totalPages = pdfDoc.getPageCount();
            filenameDisplay.textContent = pdfFile.name;
            filesizeDisplay.textContent = `Total Size: ${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB`;
            totalPagesDisplay.textContent = totalPages;

            uploadArea.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");
        } catch (error) {
            console.error("Load error:", error);
            const msg = error.message.includes("encrypted") 
                ? "❌ PDF is password protected. Please unlock it first."
                : "❌ Failed to load PDF.";
            showError(msg);
        }
    });

    const showError = (msg) => {
        uploadErrorMessage.innerHTML = msg;
        uploadErrorMessage.classList.remove("hidden");
        pdfInput.value = "";
    };

    // --- Core Processing Logic ---
    processBtn.addEventListener("click", async () => {
        if (!pdfArrayBuffer) return;

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");

            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer.slice(0));
            const pages = pdfDoc.getPages();
            
            // 1. Determine Base Dimensions
            let baseWidth, baseHeight;
            if (sizePreset.value === 'custom') {
                baseWidth = parseFloat(document.getElementById('custom-width').value) || 595;
                baseHeight = parseFloat(document.getElementById('custom-height').value) || 842;
            } else {
                [baseWidth, baseHeight] = PRESETS[sizePreset.value];
            }

            // 2. Handle Orientation Flip
            let targetWidth, targetHeight;
            if (selectedOrientation === 'landscape') {
                targetWidth = Math.max(baseWidth, baseHeight);
                targetHeight = Math.min(baseWidth, baseHeight);
            } else {
                targetWidth = Math.min(baseWidth, baseHeight);
                targetHeight = Math.max(baseWidth, baseHeight);
            }

            

            // 3. Apply Resize and Smart Scaling to all pages
            pages.forEach(page => {
                const { width: originalWidth, height: originalHeight } = page.getSize();
                
                // Calculate Scale Factor (Fit to page)
                const scaleX = targetWidth / originalWidth;
                const scaleY = targetHeight / originalHeight;
                const scale = Math.min(scaleX, scaleY);
                
                // Change the page boundaries
                page.setSize(targetWidth, targetHeight);
                
                // Scale content to new size
                page.scale(scale, scale);
                
                // Center content mathematically
                const xOffset = (targetWidth - (originalWidth * scale)) / 2;
                const yOffset = (targetHeight - (originalHeight * scale)) / 2;
                page.translateContent(xOffset, yOffset);
            });

            

            const pdfBytes = await pdfDoc.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (error) {
            console.error("Resize Error:", error);
            alert("Error: " + error.message);
            resetUI();
        }
    });

    // --- Download and Cleanup ---
    downloadPdfBtn.addEventListener("click", () => {
        if (!processedPdfBlob) return;
        const url = URL.createObjectURL(processedPdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${pdfFile.name.replace(".pdf", "")}-resized-mytoolkitpro.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    });

    const resetUI = () => {
        pdfFile = null;
        pdfArrayBuffer = null;
        processedPdfBlob = null;
        pdfInput.value = "";
        toggleOrientation('portrait');
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");
    };

    resetBtn.addEventListener("click", resetUI);
    removeFileBtn.addEventListener("click", resetUI);

    // --- Drag & Drop Helpers ---
    ['dragover', 'dragenter'].forEach(e => {
        uploadArea.addEventListener(e, (evt) => {
            evt.preventDefault();
            uploadArea.classList.add('bg-red-50', 'border-primary');
        });
    });

    ['dragleave', 'drop'].forEach(e => {
        uploadArea.addEventListener(e, () => {
            uploadArea.classList.remove('bg-red-50', 'border-primary');
        });
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) {
            pdfInput.files = e.dataTransfer.files;
            pdfInput.dispatchEvent(new Event('change'));
        }
    });
});