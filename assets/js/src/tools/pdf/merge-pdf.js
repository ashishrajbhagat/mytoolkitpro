/**
 * MyToolKitPro - Merge PDF Logic
 * Dependencies: pdf-lib
 */

// Wait until the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {

    // Get all required DOM elements
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFiles");
    const uploadErrorMessage = document.getElementById("upload-error-message");

    const filePreviewArea = document.getElementById("file-preview-area");
    const selectedFilesList = document.getElementById("selected-files-list");
    const totalSizeDisplay = document.getElementById("total-size-display");
    const fileCountDisplay = document.getElementById("file-count-display");
    const warningMessage = document.getElementById("warning-message");
    const mergeBtn = document.getElementById("merge-action-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");

    const processingState = document.getElementById("processing-state");
    const progressText = document.getElementById("progress-text");
    const progressBar = document.getElementById("progress-bar");

    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");

    const faqButtons = document.querySelectorAll(".faq-toggle");

    // Store selected PDF files and merged blob
    let selectedFiles = [];
    let mergedPdfBlob = null;

    // File size validation constants
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file
    const MAX_TOTAL_SIZE = 150 * 1024 * 1024; // 150 MB total
    const FILE_SIZE_WARNING = 30 * 1024 * 1024; // 30 MB warning

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
    // Handle File Selection
    // --------------------------------------------------
    pdfInput.addEventListener("change", (e) => {
        // Convert FileList to array and filter only PDF files
        selectedFiles = Array.from(e.target.files)
            .filter((file) => file.type === "application/pdf");

        // If no valid PDFs selected, exit
        if (selectedFiles.length === 0) return;

        // Validate individual file sizes
        let totalSize = 0;
        let oversizedFiles = [];

        selectedFiles.forEach((file) => {
            totalSize += file.size;
            if (file.size > MAX_FILE_SIZE) {
                oversizedFiles.push(`${file.name} (${formatBytes(file.size)})`);
            }
        });

        // Check for oversized files
        if (oversizedFiles.length > 0) {
            uploadErrorMessage.classList.remove("hidden");
            uploadErrorMessage.innerHTML = `❌ Error: The following files exceed max size (${formatBytes(MAX_FILE_SIZE)}):<br> ${oversizedFiles.join(', ')}`;
            selectedFiles = [];
            return;
        }

        // Check total size
        if (totalSize > MAX_TOTAL_SIZE) {
            uploadErrorMessage.classList.remove("hidden");
            uploadErrorMessage.innerHTML = `❌ Error: Total size (${formatBytes(totalSize)}) exceeds maximum limit (${formatBytes(MAX_TOTAL_SIZE)}). Please select fewer files.`;
            selectedFiles = [];
            return;
        } else {
            uploadErrorMessage.classList.add("hidden");
        }

        // Show warning if total size is large
        if (totalSize > FILE_SIZE_WARNING) {
            warningMessage.classList.remove("hidden");
            warningMessage.innerText = `⚠️ Warning: Large total size (${formatBytes(totalSize)}). Merging may take longer.`;
        } else {
            warningMessage.classList.add("hidden");
        }

        // Update UI after valid selection
        renderFileList(selectedFiles, totalSize);

        // Switch to preview
        uploadArea.classList.add("hidden");
        filePreviewArea.classList.remove("hidden");
    });

    // --------------------------------------------------
    // Render File List
    // --------------------------------------------------
    const renderFileList = (files, totalSize) => {
        selectedFilesList.innerHTML = ""; // Clear list
        totalSizeDisplay.textContent = formatBytes(totalSize);
        fileCountDisplay.textContent = files.length;

        files.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm";
            item.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="bg-red-100 text-red-600 p-2 rounded-lg">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-700 truncate">${file.name}</p>
                        <p class="text-xs text-gray-500">${formatBytes(file.size)}</p>
                    </div>
                </div>
                <span class="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">#${index + 1}</span>
            `;
            selectedFilesList.appendChild(item);
        });
    };

    // --------------------------------------------------
    // Handle Merge Button Click
    // --------------------------------------------------
    mergeBtn.addEventListener("click", async () => {
        try {
            // Prevent execution if no files selected
            if (selectedFiles.length === 0) return;

            // Reset UI
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");
            progressText.innerText = "Initializing merge process...";
            progressBar.style.width = '0%';
            
            // Scroll back to the process area
            processingState.scrollIntoView({ behavior: "smooth", block: "center" });

            try {
                // Create a new empty PDF document
                const mergedPdf = await PDFLib.PDFDocument.create();

                // Loop through all selected files
                for (let i = 0; i < selectedFiles.length; i++) {
                    try {
                        // Update progress text
                        progressText.innerText = `Merging file ${i + 1} of ${selectedFiles.length}...`;
                        
                        // Update progress bar
                        const percentComplete = ((i + 1) / selectedFiles.length) * 100;
                        progressBar.style.width = `${percentComplete}%`;

                        // Yield to main thread
                        await new Promise(resolve => setTimeout(resolve, 50));

                        const file = selectedFiles[i];

                        // Convert file to ArrayBuffer
                        let arrayBuffer;
                        try {
                            arrayBuffer = await file.arrayBuffer();
                        } catch (bufferError) {
                            console.error(`Error reading file ${i + 1}:`, bufferError);
                            throw new Error(`Failed to read file "${file.name}". Please ensure it's a valid PDF.`);
                        }

                        // Load the PDF document
                        let pdf;
                        try {
                            pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                        } catch (loadError) {
                            console.error(`Error loading PDF ${i + 1}:`, loadError);
                            throw new Error(`Failed to load PDF "${file.name}". It may be corrupted or not a valid PDF file.`);
                        }

                        // Copy all pages from current PDF
                        let copiedPages;
                        try {
                            copiedPages = await mergedPdf.copyPages(
                                pdf,
                                pdf.getPageIndices()
                            );
                        } catch (copyError) {
                            console.error(`Error copying pages from file ${i + 1}:`, copyError);
                            throw new Error(`Failed to extract pages from "${file.name}". The PDF may be protected or have compatibility issues.`);
                        }

                        // Add copied pages into merged document
                        try {
                            copiedPages.forEach((page) => mergedPdf.addPage(page));
                        } catch (addPageError) {
                            console.error(`Error adding pages from file ${i + 1}:`, addPageError);
                            throw new Error(`Failed to add pages from "${file.name}" to the merged document.`);
                        }

                    } catch (fileError) {
                        console.error(`Error processing file ${i + 1}:`, fileError);
                        throw fileError;
                    }
                }

                progressText.textContent = 'Finalizing document...';

                // Save merged PDF as byte array
                let mergedBytes;
                try {
                    mergedBytes = await mergedPdf.save();
                } catch (saveError) {
                    console.error("Error saving merged PDF:", saveError);
                    throw new Error("Failed to save the merged PDF. Please try again with different files.");
                }

                // Create Blob from merged PDF
                try {
                    mergedPdfBlob = new Blob([mergedBytes], { type: "application/pdf" });
                } catch (blobError) {
                    console.error("Error creating blob:", blobError);
                    throw new Error("Failed to create downloadable file. Please try again.");
                }

                // Merge successful
                processingState.classList.add("hidden");
                resultsArea.classList.remove("hidden");

                // Scroll back to the result area
                resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

            } catch (mergeError) {
                console.error("Merge operation error:", mergeError);
                alert("Merge failed: " + (mergeError.message || "Unknown error"));
                resetUI();
            }

        } catch (error) {
            // Catch any unexpected errors
            console.error("Unexpected error in merge handler:", error);
            alert("An unexpected error occurred.");
            resetUI();
        }
    });

    // --------------------------------------------------
    // Reset / Start Over
    // --------------------------------------------------
    const resetUI = () => {
        selectedFiles = [];
        mergedPdfBlob = null;
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
    // Download Merged PDF
    // --------------------------------------------------
    downloadPdfBtn.addEventListener("click", () => {
        if (!mergedPdfBlob) return;

        const link = document.createElement("a");
        link.href = URL.createObjectURL(mergedPdfBlob);
        
        // Use name of first file for the merged filename
        const fileName = selectedFiles[0].name.replace(/\.[^/.]+$/, "");
        link.download = `${fileName}-merged-mytoolkitpro.pdf`;
        link.click();
    });

});