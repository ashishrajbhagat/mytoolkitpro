/**
 * MyToolKitPro - PDF to JPG Conversion Logic
 * Dependencies: pdf.js, jszip
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
    const prevPageBtn = document.getElementById("prev-page-btn");
    const nextPageBtn = document.getElementById("next-page-btn");
    const previewPageNum = document.getElementById("preview-page-num");
    const previewTotalPages = document.getElementById("preview-total-pages");
    const filenameDisplay = document.getElementById("filename-display");
    const filesizeDisplay = document.getElementById("filesize-display");
    const totalPagesInfo = document.getElementById("total-pages-info");
    const warningMessage = document.getElementById("warning-message");
    const convertBtn = document.getElementById("convert-action-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");

    const processingState = document.getElementById("processing-state");
    const progressText = document.getElementById("progress-text");
    const progressBar = document.getElementById("progress-bar");

    const resultsArea = document.getElementById("results-area");
    const downloadZipBtn = document.getElementById("download-zip-btn");
    const downloadSingleBtn = document.getElementById("download-single-btn");
    const resetBtn = document.getElementById("reset-btn");

    const faqButtons = document.querySelectorAll(".faq-toggle");

    // Store selected PDF file and generated images
    let pdfFile = null;
    let currentPreviewPdf = null;
    let currentPreviewPage = 1;
    let images = [];

    // File size validation constants
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    const FILE_SIZE_WARNING = 20 * 1024 * 1024; // 20 MB

    // --------------------------------------------------
    // Drag and Drop Logic
    // --------------------------------------------------
    
    // Prevent default drag behaviors
    ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop zone
    ;['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('border-primary', 'bg-red-50'), false);
    });

    // Unhighlight drop zone
    ;['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('border-primary', 'bg-red-50'), false);
    });

    // Handle dropped files
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

        // Store selected file
        pdfFile = e.target.files[0];

        // Exit if no file selected
        if (!pdfFile) return;

        // Validate file size
        if (pdfFile.size > MAX_FILE_SIZE) {
            uploadErrorMessage.classList.remove("hidden");
            uploadErrorMessage.innerHTML = `❌ Error: File size (${formatBytes(pdfFile.size)}) exceeds maximum limit (${formatBytes(MAX_FILE_SIZE)}). Please select a smaller file.`;
            pdfFile = null;
            return;
        } else {
            uploadErrorMessage.classList.add("hidden");
        }

        // Show warning if file is large
        if (pdfFile.size > FILE_SIZE_WARNING) {
            warningMessage.classList.remove("hidden");
            warningMessage.innerText = `⚠️ Warning: Large file (${formatBytes(pdfFile.size)}). Conversion may take longer.`;
        } else {
            warningMessage.classList.add("hidden");
        }

        // Update UI after file selection
        filenameDisplay.textContent = pdfFile.name;
        filesizeDisplay.textContent = formatBytes(pdfFile.size);

        // Generate Thumbnail
        loadPdfPreview(pdfFile);

        // Switch to preview
        uploadArea.classList.add("hidden");
        filePreviewArea.classList.remove("hidden");
    });

    // --------------------------------------------------
    // Load PDF for Preview
    // --------------------------------------------------
    const loadPdfPreview = async (file) => {
        try {
            // Show loader
            previewLoader.classList.remove("hidden");

            const arrayBuffer = await file.arrayBuffer();
            currentPreviewPdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
            
            // Update total pages info
            const totalPages = currentPreviewPdf.numPages;
            previewTotalPages.textContent = totalPages;
            totalPagesInfo.textContent = totalPages;
            
            // Reset to page 1
            currentPreviewPage = 1;
            renderPreviewPage(currentPreviewPage);

        } catch (error) {
            console.error("Error loading PDF preview:", error);
            alert("Failed to load PDF preview. The file might be corrupted.");
            previewLoader.classList.add("hidden");
        }
    };

    // --------------------------------------------------
    // Render Specific Preview Page
    // --------------------------------------------------
    const renderPreviewPage = async (pageNum) => {
        if (!currentPreviewPdf) return;

        try {
            // Show loader during page render
            previewLoader.classList.remove("hidden");

            const page = await currentPreviewPdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 }); // Scale 1 for preview
            const context = pdfPreviewCanvas.getContext('2d');
            
            pdfPreviewCanvas.height = viewport.height;
            pdfPreviewCanvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Update UI Controls
            previewPageNum.textContent = pageNum;
            
            // Toggle buttons based on current page
            prevPageBtn.classList.toggle("hidden", pageNum <= 1);
            nextPageBtn.classList.toggle("hidden", pageNum >= currentPreviewPdf.numPages);

        } catch (error) {
            console.error("Error rendering page:", error);
        } finally {
            // Hide loader when done
            previewLoader.classList.add("hidden");
        }
    };

    // Navigation Event Listeners
    prevPageBtn.addEventListener("click", () => {
        if (currentPreviewPage > 1) renderPreviewPage(--currentPreviewPage);
    });

    nextPageBtn.addEventListener("click", () => {
        if (currentPreviewPdf && currentPreviewPage < currentPreviewPdf.numPages) {
            renderPreviewPage(++currentPreviewPage);
        }
    });

    // --------------------------------------------------
    // Convert PDF Pages to JPG Images
    // --------------------------------------------------
    convertBtn.addEventListener("click", async () => {

        // Prevent execution if no file selected
        if (!pdfFile) return;

        try {
            // Reset UI
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");
            progressText.innerText = "Initializing conversion...";
            progressBar.style.width = '0%';
            
            // Scroll back to the process area
            processingState.scrollIntoView({ behavior: "smooth", block: "center" });

            const fileReader = new FileReader();

            // Error handler for FileReader
            fileReader.onerror = () => {
                alert("Error reading file");
                resetUI();
            };

            // Abort handler for FileReader
            fileReader.onabort = () => {
                alert("File reading aborted");
                resetUI();
            };

            // When file reading is complete
            fileReader.onload = async function () {
                try {
                    // Convert ArrayBuffer to typed array
                    const typedarray = new Uint8Array(this.result);

                    // Load PDF document using pdf.js
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;

                    images = []; // Reset images array

                    // Loop through each page
                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {

                        progressText.textContent = `Processing high-quality image ${pageNum} of ${pdf.numPages}`;

                        // Update progress bar
                        const percentComplete = (pageNum / pdf.numPages) * 100;
                        progressBar.style.width = `${percentComplete}%`;

                        // Yield to main thread to allow UI update
                        await new Promise(resolve => setTimeout(resolve, 50));

                        try {
                            const page = await pdf.getPage(pageNum);

                            // Increase scale for better image quality
                            const viewport = page.getViewport({ scale: 2 });

                            // Create canvas dynamically
                            const canvas = document.createElement("canvas");
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;

                            // Render PDF page into canvas
                            await page.render({
                                canvasContext: canvas.getContext("2d"),
                                viewport
                            }).promise;

                            // Convert canvas to JPG base64 image
                            const imgData = canvas.toDataURL("image/jpeg");
                            images.push(imgData);
                        } catch (pageError) {
                            console.error(`Error processing page ${pageNum}:`, pageError);
                            throw new Error(`Failed to convert page ${pageNum}. Please try a different PDF.`);
                        }
                    }

                    progressText.textContent = 'Bundling your images...';

                    // Conversion completed successfully
                    processingState.classList.add("hidden");
                    resultsArea.classList.remove("hidden");

                    // Scroll back to the result area
                    resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

                    // Show download options
                    if (images.length === 1) {
                        downloadSingleBtn.classList.remove("hidden");
                        downloadZipBtn.classList.add("hidden");
                    } else if (images.length > 1) {
                        downloadZipBtn.classList.remove("hidden");
                        downloadSingleBtn.classList.add("hidden");
                    }

                } catch (error) {
                    console.error("PDF conversion error:", error);
                    alert("Conversion failed: " + error.message);
                    resetUI();
                }
            };

            // Read PDF file as ArrayBuffer
            fileReader.readAsArrayBuffer(pdfFile);
        } catch (error) {
            console.error("PDF to JPG conversion error:", error);
            alert("An unexpected error occurred.");
            resetUI();
        }
    });

    // --------------------------------------------------
    // Reset / Start Over
    // --------------------------------------------------
    const resetUI = () => {
        pdfFile = null;
        currentPreviewPdf = null;
        images = [];
        pdfInput.value = ""; // Clear input
        progressBar.style.width = '0%';
        warningMessage.classList.add("hidden");
        
        // Hide all sections except upload
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");

        // Scroll back to the upload area
        uploadArea.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    resetBtn.addEventListener("click", resetUI);
    removeFileBtn.addEventListener("click", resetUI);

    // --------------------------------------------------
    // Download Single Image
    // --------------------------------------------------
    downloadSingleBtn.addEventListener("click", () => {

        const link = document.createElement("a");
        link.href = images[0];
        const fileName = pdfFile ? pdfFile.name.replace(/\.[^/.]+$/, "") : "converted";
        link.download = `${fileName}-mytoolkitpro.jpg`;
        link.click();
    });

    // --------------------------------------------------
    // Download All Images as ZIP
    // --------------------------------------------------
    downloadZipBtn.addEventListener("click", async () => {

        const zip = new JSZip();

        // Add each image to ZIP file
        images.forEach((img, index) => {
            const base64Data = img.split(",")[1];

            zip.file(
                `page-${index + 1}.jpg`,
                base64Data,
                { base64: true }
            );
        });

        // Generate ZIP file as blob
        const content = await zip.generateAsync({ type: "blob" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        const fileName = pdfFile ? pdfFile.name.replace(/\.[^/.]+$/, "") : "converted";
        link.download = `${fileName}-mytoolkitpro.zip`;
        link.click();
    });

});