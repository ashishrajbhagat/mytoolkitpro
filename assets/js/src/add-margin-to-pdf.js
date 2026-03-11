/**
 * MyToolKitPro - Add Margin to PDF Logic
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
    const loadingState = document.getElementById("loading-state");
    const filePreviewArea = document.getElementById("file-preview-area");
    
    // Inputs
    const mT = document.getElementById("margin-top");
    const mB = document.getElementById("margin-bottom");
    const mL = document.getElementById("margin-left");
    const mR = document.getElementById("margin-right");
    const pageScope = document.getElementById("page-scope");
    const mirrorMargins = document.getElementById("mirror-margins");

    // UI States
    const processBtn = document.getElementById("process-action-btn");
    const processingState = document.getElementById("processing-state");
    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");

    // --------------------------------------------------
    // State Variables
    // --------------------------------------------------
    let pdfFile = null;
    let pdfArrayBuffer = null;
    let processedPdfBlob = null;
    let downloadUrl = null;

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const MM_TO_POINTS = 2.83465;

    // --------------------------------------------------
    // Helper Functions
    // --------------------------------------------------
    window.applyPreset = (val) => {
        [mT, mB, mL, mR].forEach(input => {
            if (input) input.value = val;
        });
    };

    const showError = (msg) => {
        uploadErrorMessage.innerHTML = msg;
        uploadErrorMessage.classList.remove("hidden");
        loadingState.classList.add("hidden");
        pdfInput.value = "";
    };

    const resetState = () => {
        pdfFile = null;
        pdfArrayBuffer = null;
        processedPdfBlob = null;
        if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
            downloadUrl = null;
        }
    };

    const resetUI = () => {
        resetState();
        pdfInput.value = "";
        uploadArea.classList.remove("hidden");
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadErrorMessage.classList.add("hidden");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --------------------------------------------------
    // File Selection & Upload
    // --------------------------------------------------
    uploadArea.addEventListener("click", () => pdfInput.click());

    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("border-primary", "bg-red-50");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("border-primary", "bg-red-50");
    });

    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("border-primary", "bg-red-50");
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });

    pdfInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    async function handleFile(file) {
        if (!file || file.type !== "application/pdf") {
            showError("❌ Please upload a valid PDF file.");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            showError("❌ File too large (Max 100MB).");
            return;
        }

        pdfFile = file;
        uploadArea.classList.add("hidden");
        uploadErrorMessage.classList.add("hidden");
        loadingState.classList.remove("hidden");
        
        try {
            // Use slice(0) to ensure we have a fresh buffer for the main processing later
            const buffer = await file.arrayBuffer();
            // Verify if PDF is encrypted
            await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: false });
            
            pdfArrayBuffer = buffer;
            loadingState.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");
        } catch (e) {
            console.error("Load Error:", e);
            const isEncrypted = e.message.includes("encrypted") || e.message.includes("password");
            showError(isEncrypted ? "❌ This PDF is password protected. Please unlock it first." : "❌ Error reading PDF file. It might be corrupted.");
            resetUI();
        }
    }

    // --------------------------------------------------
    // Core Margin Logic
    // --------------------------------------------------
    processBtn.addEventListener("click", async () => {
        if (!pdfArrayBuffer) return;
        
        filePreviewArea.classList.add("hidden");
        processingState.classList.remove("hidden");

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer);
            const newPdf = await PDFLib.PDFDocument.create();
            
            // Convert user MM inputs to PDF points
            const marginSettings = {
                t: Math.max(0, parseFloat(mT.value || 0)) * MM_TO_POINTS,
                b: Math.max(0, parseFloat(mB.value || 0)) * MM_TO_POINTS,
                l: Math.max(0, parseFloat(mL.value || 0)) * MM_TO_POINTS,
                r: Math.max(0, parseFloat(mR.value || 0)) * MM_TO_POINTS
            };

            const scope = pageScope.value;
            const mirror = mirrorMargins.checked;

            // Embed pages to create PDFEmbeddedPage objects (Fixes the NaN/Type error)
            const embeddedPages = await newPdf.embedPages(await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices()));
            
            embeddedPages.forEach((embeddedPage, index) => {
                const pageNum = index + 1;
                let shouldApply = false;

                // Determine if this page matches the user's scope
                if (scope === "all") shouldApply = true;
                else if (scope === "odd" && pageNum % 2 !== 0) shouldApply = true;
                else if (scope === "even" && pageNum % 2 === 0) shouldApply = true;
                else if (scope === "first" && pageNum === 1) shouldApply = true;

                const { width, height } = embeddedPage;
                
                if (shouldApply) {
                    let left = marginSettings.l;
                    let right = marginSettings.r;

                    // Mirror Margins (Gutter) Logic for Even Pages
                    if (mirror && pageNum % 2 === 0) {
                        [left, right] = [right, left];
                    }

                    const newWidth = width + left + right;
                    const newHeight = height + marginSettings.t + marginSettings.b;
                    
                    const newPage = newPdf.addPage([newWidth, newHeight]);
                    
                    // Draw original content onto the new, larger page
                    // x and y define the offset from the bottom-left corner
                    newPage.drawPage(embeddedPage, {
                        x: left,
                        y: marginSettings.b,
                        width: width,
                        height: height
                    });
                } else {
                    // Add page without changes
                    const newPage = newPdf.addPage([width, height]);
                    newPage.drawPage(embeddedPage);
                }
            });

            const pdfBytes = await newPdf.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
            
            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            console.error("Processing Error:", err);
            alert("An error occurred while adding margins. Please try a different PDF file.");
            resetUI();
        }
    });

    // --------------------------------------------------
    // Download & UI Reset
    // --------------------------------------------------
    downloadPdfBtn.addEventListener("click", () => {
        if (!processedPdfBlob) return;
        
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        downloadUrl = URL.createObjectURL(processedPdfBlob);

        const link = document.createElement("a");
        link.href = downloadUrl;
        const baseName = pdfFile ? pdfFile.name.replace(/\.[^/.]+$/, "") : "document";
        link.download = `${baseName}-with-margins-mytoolkitpro.pdf`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    resetBtn.addEventListener("click", resetUI);
    removeFileBtn.addEventListener("click", resetUI);
});