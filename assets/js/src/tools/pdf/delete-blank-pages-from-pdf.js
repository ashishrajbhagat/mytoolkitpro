/**
 * YantraStack - Delete Blank Pages Logic
 * Dependencies: pdf-lib (for editing), pdf.js (for visual analysis)
 */

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "../assets/js/vendor/pdf.worker.min.js";

// Wait until DOM is fully loaded before executing script
document.addEventListener("DOMContentLoaded", () => {

    // --------------------------------------------------
    // DOM Elements
    // --------------------------------------------------
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");
    const processingState = document.getElementById("processing-state");
    const progressText = document.getElementById("progress-text");
    const progressBar = document.getElementById("progress-bar");

    const resultsArea = document.getElementById("results-area");
    const resultMessage = document.getElementById("result-message");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");

    // --------------------------------------------------
    // State Variables
    // --------------------------------------------------
    let pdfFile = null;
    let processedPdfBlob = null;
    let downloadUrl = null;

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    // --------------------------------------------------
    // Drag & Drop Handling
    // --------------------------------------------------
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
        uploadArea.addEventListener(name, preventDefaults, false);
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

    // --------------------------------------------------
    // Blank Page Detection Algorithm
    // --------------------------------------------------
    const isPageBlank = async (page) => {
        // Render at a low scale for speed; high enough to detect stray marks
        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        try {
            await page.render({ canvasContext: context, viewport }).promise;
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Threshold: Pixels with any RGB value below 245 are considered "content"
            // This allows for slight off-white paper or compression artifacts
            const pixelThreshold = 245; 
            let contentPixels = 0;
            
            // Total pixels to check
            const totalPixels = data.length / 4;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                if (r < pixelThreshold || g < pixelThreshold || b < pixelThreshold) {
                    contentPixels++;
                }

                // If more than 0.05% of the page has content, it's not blank
                // This accounts for small dust particles on scans
                if (contentPixels > (totalPixels * 0.0005)) {
                    return false; 
                }
            }
            return true; 
        } catch (e) {
            console.error("Page analysis failed", e);
            return false; // Assume not blank if we can't analyze it
        } finally {
            canvas.width = 0;
            canvas.height = 0; // Clean up canvas memory
        }
    };

    // --------------------------------------------------
    // File Processing
    // --------------------------------------------------
    pdfInput.addEventListener("change", async (e) => {
        pdfFile = e.target.files[0];
        if (!pdfFile) return;

        // Reset UI from previous errors
        uploadErrorMessage.classList.add("hidden");

        if (pdfFile.type !== "application/pdf") {
            showUploadError("❌ Only PDF files are allowed.");
            return;
        }

        if (pdfFile.size > MAX_FILE_SIZE) {
            showUploadError("❌ File too large. Max 100MB.");
            return;
        }

        try {
            uploadArea.classList.add("hidden");
            processingState.classList.remove("hidden");
            progressBar.style.width = "0%";

            const pdfArrayBuffer = await pdfFile.arrayBuffer();
            
            // 1. Load with PDF.js for analysis
            const loadingTask = pdfjsLib.getDocument({ 
                data: new Uint8Array(pdfArrayBuffer.slice(0)),
                stopAtErrors: true
            });
            
            const pdf = await loadingTask.promise;
            const blankPageIndices = [];

            // 2. Analyze pages
            for (let i = 1; i <= pdf.numPages; i++) {
                const percent = Math.round((i / pdf.numPages) * 100);
                progressText.innerText = `Analyzing page ${i} of ${pdf.numPages}...`;
                progressBar.style.width = `${percent}%`;

                const page = await pdf.getPage(i);
                const blank = await isPageBlank(page);
                if (blank) {
                    blankPageIndices.push(i - 1);
                }
            }

            // 3. Modify with PDF-Lib
            progressText.innerText = "Reconstructing document...";
            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: false });
            
            if (blankPageIndices.length === pdf.numPages) {
                throw new Error("Cannot delete all pages. Document must have at least one page.");
            }

            // Remove pages in reverse order so indices don't shift
            blankPageIndices.reverse().forEach(index => {
                pdfDoc.removePage(index);
            });

            const pdfBytes = await pdfDoc.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            // 4. Update Success UI
            if (blankPageIndices.length > 0) {
                resultMessage.innerHTML = `Success! We removed <strong>${blankPageIndices.length}</strong> blank page(s) from your document.`;
            } else {
                resultMessage.innerText = "We analyzed your document, but no blank pages were found.";
            }

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("Processing Error:", error);
            let userMsg = "❌ Failed to process PDF.";
            
            if (error.message.includes("password") || error.message.includes("encrypted")) {
                userMsg = "❌ This PDF is password protected. Please unlock it first.";
            } else if (error.message.includes("at least one page")) {
                userMsg = "❌ Resulting document would be empty. All pages in this PDF are blank!";
            } else {
                userMsg = "❌ Could not process this PDF. It may be corrupted or restricted.";
            }
            
            showUploadError(userMsg);
            resetState();
        }
    });

    // --------------------------------------------------
    // UI Helpers & Cleanup
    // --------------------------------------------------
    const showUploadError = (msg) => {
        uploadErrorMessage.innerHTML = msg;
        uploadErrorMessage.classList.remove("hidden");
        processingState.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        pdfInput.value = "";
    };

    const resetState = () => {
        pdfFile = null;
        processedPdfBlob = null;
        if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
            downloadUrl = null;
        }
    };

    const resetUI = () => {
        resetState();
        pdfInput.value = "";
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");
        progressBar.style.width = "0%";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    resetBtn.addEventListener("click", resetUI);

    downloadPdfBtn.addEventListener("click", () => {
        if (!processedPdfBlob) return;
        
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        downloadUrl = URL.createObjectURL(processedPdfBlob);

        const link = document.createElement("a");
        link.href = downloadUrl;
        const baseName = pdfFile ? pdfFile.name.replace(/\.[^/.]+$/, "") : "document";
        link.download = `${baseName}-cleaned-yantrastack.pdf`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});