/**
 * MyToolKitPro - JPG to PDF Conversion Logic
 * Dependencies: jspdf
 */

// Wait until DOM is fully loaded before executing script
document.addEventListener("DOMContentLoaded", () => {

    // Get required DOM elements
    const uploadArea = document.getElementById("upload-area");
    const imageInput = document.getElementById("imageFiles");
    const uploadErrorMessage = document.getElementById("upload-error-message");

    const filePreviewArea = document.getElementById("file-preview-area");
    const imagePreview = document.getElementById("image-preview");
    const prevImageBtn = document.getElementById("prev-image-btn");
    const nextImageBtn = document.getElementById("next-image-btn");
    const previewImageNum = document.getElementById("preview-image-num");
    const previewTotalImages = document.getElementById("preview-total-images");
    const filenameDisplay = document.getElementById("filename-display");
    const filesizeDisplay = document.getElementById("filesize-display");
    const totalImagesInfo = document.getElementById("total-images-info");
    const warningMessage = document.getElementById("warning-message");
    const convertBtn = document.getElementById("convert-action-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");

    const processingState = document.getElementById("processing-state");
    const progressText = document.getElementById("progress-text");
    const progressBar = document.getElementById("progress-bar");

    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");

    const faqButtons = document.querySelectorAll(".faq-toggle");

    // Destructure jsPDF from global window object
    const { jsPDF } = window.jspdf;

    // Store selected image files and generated PDF
    let selectedFiles = [];
    let currentPreviewIndex = 0;
    let generatedPdfBlob = null;

    // File size validation constants
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file
    const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100 MB total
    const FILE_SIZE_WARNING = 20 * 1024 * 1024; // 20 MB warning

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
        
        imageInput.files = files;
        imageInput.dispatchEvent(new Event('change'));
    }, false);

    // Handle keyboard navigation for upload area
    uploadArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            imageInput.click();
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
    // Utility Function: Convert file to Base64 Data URL
    // --------------------------------------------------
    const fileToDataURL = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            // Resolve with Base64 result
            reader.onload = () => resolve(reader.result);
            // Reject if error occurs
            reader.onerror = reject;
            // Read file as Data URL
            reader.readAsDataURL(file);
        });

    // --------------------------------------------------
    // Handle Image File Selection
    // --------------------------------------------------
    imageInput.addEventListener("change", (e) => {

        // Filter only JPG and PNG files
        selectedFiles = Array.from(e.target.files)
            .filter((file) =>
                ["image/jpeg", "image/png"].includes(file.type)
            );

        // If no valid images selected, exit
        if (!selectedFiles.length) return;

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
            uploadErrorMessage.innerHTML = `❌ Error: Total size (${formatBytes(totalSize)}) exceeds maximum limit (${formatBytes(MAX_TOTAL_SIZE)}). Please select fewer or smaller images.`;
            selectedFiles = [];
            return;
        } else {
            uploadErrorMessage.classList.add("hidden");
        }

        // Show warning if total size is large
        if (totalSize > FILE_SIZE_WARNING) {
            warningMessage.classList.remove("hidden");
            warningMessage.innerText = `⚠️ Warning: Large total size (${formatBytes(totalSize)}). Conversion may take longer.`;
        } else {
            warningMessage.classList.add("hidden");
        }

        // Update UI after selection
        filenameDisplay.textContent = selectedFiles[0].name + (selectedFiles.length > 1 ? ` + ${selectedFiles.length - 1} more` : "");
        filesizeDisplay.textContent = formatBytes(totalSize);
        totalImagesInfo.textContent = selectedFiles.length;
        previewTotalImages.textContent = selectedFiles.length;

        // Load first image for preview
        currentPreviewIndex = 0;
        loadPreviewImage(currentPreviewIndex);

        // Switch to preview
        uploadArea.classList.add("hidden");
        filePreviewArea.classList.remove("hidden");
    });

    // --------------------------------------------------
    // Load Preview Image
    // --------------------------------------------------
    const loadPreviewImage = async (index) => {
        if (index < 0 || index >= selectedFiles.length) return;

        const file = selectedFiles[index];
        const imageUrl = URL.createObjectURL(file);
        
        imagePreview.src = imageUrl;
        previewImageNum.textContent = index + 1;
        filenameDisplay.textContent = file.name;

        // Toggle buttons
        prevImageBtn.classList.toggle("hidden", index <= 0);
        nextImageBtn.classList.toggle("hidden", index >= selectedFiles.length - 1);
    };

    // Navigation Event Listeners
    prevImageBtn.addEventListener("click", () => {
        if (currentPreviewIndex > 0) {
            currentPreviewIndex--;
            loadPreviewImage(currentPreviewIndex);
        }
    });

    nextImageBtn.addEventListener("click", () => {
        if (currentPreviewIndex < selectedFiles.length - 1) {
            currentPreviewIndex++;
            loadPreviewImage(currentPreviewIndex);
        }
    });

    // --------------------------------------------------
    // Convert Selected Images to PDF
    // --------------------------------------------------
    convertBtn.addEventListener("click", async () => {

        // Prevent execution if no files selected
        if (!selectedFiles.length) return;

        try {
            // Reset UI
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");
            progressText.innerText = "Initializing conversion...";
            progressBar.style.width = '0%';
            
            // Scroll back to the process area
            processingState.scrollIntoView({ behavior: "smooth", block: "center" });

            // Create new PDF document
            const pdf = new jsPDF();

            // Loop through selected images
            for (let i = 0; i < selectedFiles.length; i++) {

                const file = selectedFiles[i];

                try {
                    // Update progress message
                    progressText.innerText = `Processing image ${i + 1} of ${selectedFiles.length}...`;
                    
                    // Update progress bar
                    const percentComplete = ((i + 1) / selectedFiles.length) * 100;
                    progressBar.style.width = `${percentComplete}%`;

                    // Yield to main thread
                    await new Promise(resolve => setTimeout(resolve, 50));

                    // Convert image to Base64
                    const imgData = await fileToDataURL(file);

                    // Wait for image to load before adding to PDF
                    await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.src = imgData;
                        img.onerror = () => {
                            reject(new Error(`Failed to load image: ${file.name}`));
                        };
                        img.onload = () => {
                            try {
                                // Calculate image dimensions to fit page width
                                const imgWidth = pdf.internal.pageSize.getWidth();
                                const imgHeight = (img.height * imgWidth) / img.width;

                                // Add new page except for first image
                                if (i > 0) pdf.addPage();

                                // Add image to PDF
                                pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
                                resolve();
                            } catch (error) {
                                reject(new Error(`Error adding image to PDF: ${error.message}`));
                            }
                        };
                    });
                } catch (imageError) {
                    throw new Error(`Error processing image ${i + 1}: ${imageError.message}`);;
                }
            }

            progressText.textContent = 'Finalizing PDF...';

            // Generate PDF Blob
            generatedPdfBlob = pdf.output('blob');

            // Conversion successful
            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");

            // Scroll back to the result area
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("JPG to PDF conversion error:", error);
            alert("Conversion failed: " + error.message);
            resetUI();
        }
    });

    // --------------------------------------------------
    // Reset / Start Over
    // --------------------------------------------------
    const resetUI = () => {
        selectedFiles = [];
        currentPreviewIndex = 0;
        generatedPdfBlob = null;
        imageInput.value = ""; // Clear input
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
    // Download PDF
    // --------------------------------------------------
    downloadPdfBtn.addEventListener("click", () => {
        if (!generatedPdfBlob) return;

        const link = document.createElement("a");
        link.href = URL.createObjectURL(generatedPdfBlob);
        
        // Use name of first image for the PDF filename
        const fileName = selectedFiles[0].name.replace(/\.[^/.]+$/, "");
        link.download = `${fileName}-mytoolkitpro.pdf`;
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