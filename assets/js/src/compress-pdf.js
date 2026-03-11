/**
 * MyToolKitPro - Compress PDF Logic
 * Dependencies: pdf.js, jspdf
 */

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc ="../assets/js/vendor/pdf.worker.min.js";

// Wait until DOM is fully loaded before executing script
document.addEventListener("DOMContentLoaded", () => {

    // Get required DOM elements
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");

    const filePreviewArea = document.getElementById("file-preview-area");
    const previewLoader = document.getElementById("preview-loader");
    const pdfPreviewCanvas = document.getElementById("pdf-preview-canvas");
    const filenameDisplay = document.getElementById("filename-display");
    const filesizeDisplay = document.getElementById("filesize-display");
    const compressBtn = document.getElementById("compress-action-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");

    const processingState = document.getElementById("processing-state");
    const progressText = document.getElementById("progress-text");
    const progressBar = document.getElementById("progress-bar");

    const resultsArea = document.getElementById("results-area");
    const resultInfo = document.getElementById("result-info");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");

    const faqButtons = document.querySelectorAll(".faq-toggle");

    // Destructure jsPDF from global window object
    const { jsPDF } = window.jspdf;

    // Store selected PDF file and generated blob
    let pdfFile = null;
    let currentPreviewPdf = null;
    let compressedPdfBlob = null;

    // File size validation constants
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

    // --------------------------------------------------
    // Drag and Drop Logic
    // --------------------------------------------------
    
    ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ;['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('border-primary', 'bg-red-50'), false);
    });

    ;['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('border-primary', 'bg-red-50'), false);
    });

    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        pdfInput.files = files;
        pdfInput.dispatchEvent(new Event('change'));
    }, false);

    // Handle keyboard navigation for upload area
    uploadArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pdfInput.click();
        }
    });

    // --------------------------------------------------
    // Utility: Format bytes to readable format (MB/GB)
    // --------------------------------------------------
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    // --------------------------------------------------
    // Handle PDF File Selection
    // --------------------------------------------------
    pdfInput.addEventListener("change", (e) => {
        pdfFile = e.target.files[0];
        if (!pdfFile) return;

        if (pdfFile.size > MAX_FILE_SIZE) {
            uploadErrorMessage.classList.remove("hidden");
            uploadErrorMessage.innerHTML = `❌ Error: File size (${formatBytes(pdfFile.size)}) exceeds maximum limit (${formatBytes(MAX_FILE_SIZE)}).`;
            pdfFile = null;
            return;
        } else {
            uploadErrorMessage.classList.add("hidden");
        }

        filenameDisplay.textContent = pdfFile.name;
        filesizeDisplay.textContent = formatBytes(pdfFile.size);

        loadPdfPreview(pdfFile);

        uploadArea.classList.add("hidden");
        filePreviewArea.classList.remove("hidden");
    });

    // --------------------------------------------------
    // Load PDF for Preview
    // --------------------------------------------------
    const loadPdfPreview = async (file) => {
        try {
            previewLoader.classList.remove("hidden");
            const arrayBuffer = await file.arrayBuffer();
            currentPreviewPdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
            renderPreviewPage(1); // Render first page
        } catch (error) {
            console.error("Error loading PDF preview:", error);
            alert("Failed to load PDF preview. The file might be corrupted.");
            previewLoader.classList.add("hidden");
        }
    };

    // --------------------------------------------------
    // Render Preview Page
    // --------------------------------------------------
    const renderPreviewPage = async (pageNum) => {
        if (!currentPreviewPdf) return;
        try {
            previewLoader.classList.remove("hidden");
            const page = await currentPreviewPdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });
            const context = pdfPreviewCanvas.getContext('2d');
            pdfPreviewCanvas.height = viewport.height;
            pdfPreviewCanvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
        } catch (error) {
            console.error("Error rendering page:", error);
        } finally {
            previewLoader.classList.add("hidden");
        }
    };

    // --------------------------------------------------
    // Compress PDF
    // --------------------------------------------------
    compressBtn.addEventListener("click", async () => {
        if (!pdfFile) return;

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");
            progressText.innerText = "Initializing compression...";
            progressBar.style.width = '0%';
            processingState.scrollIntoView({ behavior: "smooth", block: "center" });

            const compressionLevel = document.querySelector('input[name="compressionLevel"]:checked').value;
            const quality = compressionLevel === 'high' ? 0.5 : 0.75; // JPEG quality

            const typedarray = new Uint8Array(await pdfFile.arrayBuffer());
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            const newPdf = new jsPDF();

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                progressText.textContent = `Compressing page ${pageNum} of ${pdf.numPages}...`;
                const percentComplete = (pageNum / pdf.numPages) * 100;
                progressBar.style.width = `${percentComplete}%`;
                await new Promise(resolve => setTimeout(resolve, 50));

                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 }); // Render at a decent scale

                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext("2d");

                await page.render({ canvasContext: context, viewport }).promise;
                const imgData = canvas.toDataURL("image/jpeg", quality);

                if (pageNum > 1) newPdf.addPage();
                
                // Add image to PDF, fitting it to the page
                const pdfWidth = newPdf.internal.pageSize.getWidth();
                const pdfHeight = newPdf.internal.pageSize.getHeight();
                const imgProps = newPdf.getImageProperties(imgData);
                const ratio = imgProps.height / imgProps.width;
                const newHeight = pdfWidth * ratio;

                let finalHeight = newHeight;
                let finalY = 0;

                if (newHeight > pdfHeight) {
                    finalHeight = pdfHeight;
                    finalY = 0;
                } else {
                    finalY = (pdfHeight - newHeight) / 2;
                }

                newPdf.addImage(imgData, "JPEG", 0, finalY, pdfWidth, finalHeight);
            }

            progressText.textContent = 'Finalizing PDF...';
            compressedPdfBlob = newPdf.output('blob');

            const originalSize = pdfFile.size;
            const newSize = compressedPdfBlob.size;
            const reduction = Math.round(((originalSize - newSize) / originalSize) * 100);

            resultInfo.textContent = `Original: ${formatBytes(originalSize)} | New: ${formatBytes(newSize)} (${reduction}% smaller)`;

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("PDF compression error:", error);
            alert("Compression failed: " + error.message);
            resetUI();
        }
    });

    // --------------------------------------------------
    // Reset / Start Over
    // --------------------------------------------------
    const resetUI = () => {
        pdfFile = null;
        currentPreviewPdf = null;
        compressedPdfBlob = null;
        pdfInput.value = "";
        progressBar.style.width = '0%';
        
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");

        uploadArea.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    resetBtn.addEventListener("click", resetUI);
    removeFileBtn.addEventListener("click", resetUI);

    // --------------------------------------------------
    // Download PDF
    // --------------------------------------------------
    downloadPdfBtn.addEventListener("click", () => {
        if (!compressedPdfBlob) return;

        const link = document.createElement("a");
        link.href = URL.createObjectURL(compressedPdfBlob);
        const fileName = pdfFile ? pdfFile.name.replace(/\.[^/.]+$/, "") : "compressed";
        link.download = `${fileName}-compressed-mytoolkitpro.pdf`;
        link.click();
    });

    // --------------------------------------------------
    // FAQ Toggle Logic
    // --------------------------------------------------
    faqButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const content = this.nextElementSibling;
            const isOpen = content.classList.toggle("hidden");
            
            this.setAttribute("aria-expanded", !isOpen);
            
            const icon = this.querySelector(".faq-icon");
            icon.textContent = isOpen ? "+" : "-";
        });
    });
});