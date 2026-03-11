/**
 * MyToolKitPro - Unlock PDF Logic
 * Dependencies: pdf-lib, pdf.js
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
    const filenameDisplay = document.getElementById("filename-display");
    const filesizeDisplay = document.getElementById("filesize-display");
    
    const passwordSection = document.getElementById("password-section");
    const passwordInput = document.getElementById("pdf-password");
    const passwordError = document.getElementById("password-error");
    
    const unlockBtn = document.getElementById("unlock-action-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");

    const processingState = document.getElementById("processing-state");
    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");

    const faqButtons = document.querySelectorAll(".faq-toggle");

    // Store selected PDF file and unlocked blob
    let pdfFile = null;
    let unlockedPdfBlob = null;
    let isEncrypted = false;

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
    pdfInput.addEventListener("change", async (e) => {
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

        // Check if file is encrypted
        await checkEncryption(pdfFile);

        uploadArea.classList.add("hidden");
        filePreviewArea.classList.remove("hidden");
    });

    // --------------------------------------------------
    // Check Encryption Status
    // --------------------------------------------------
    const checkEncryption = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();

            // Load the document but tell pdf-lib NOT to throw an error if it's encrypted
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { 
                ignoreEncryption: true 
            });
            
            // Check the internal state of the document
            isEncrypted = pdfDoc.isEncrypted;

            if (isEncrypted) {
                passwordSection.classList.remove("hidden");
                unlockBtn.innerText = "Unlock PDF";
                passwordInput.focus();
            } else {
                passwordSection.classList.add("hidden");
                unlockBtn.innerText = "Unlock PDF";
            }
            
        } catch (error) {
            console.error("Error checking PDF:", error);
            uploadErrorMessage.classList.remove("hidden");
            uploadErrorMessage.innerText = "❌ Error: Could not read PDF file structure.";
            resetUI();
        }
    };

    // --------------------------------------------------
    // Unlock PDF
    // --------------------------------------------------
    unlockBtn.addEventListener("click", async () => {
        if (!pdfFile) return;

        const password = passwordInput.value.trim();

        if (isEncrypted && !password) {
            passwordError.classList.remove("hidden");
            passwordError.innerText = "Please enter the password.";
            return;
        }

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");
            passwordError.classList.add("hidden");

            const arrayBuffer = await pdfFile.arrayBuffer();

            const pdfjs = window.pdfjsLib;
            if (!pdfjs) {
                throw new Error("PDF.js not loaded properly.");
            }

            // 🔐 Step 1: Open & decrypt using PDF.js
            const loadingTask = pdfjs.getDocument({
                data: arrayBuffer,
                password: password || undefined
            });

            const pdf = await loadingTask.promise;

            // 🆕 Step 2: Create brand new PDF
            const newPdf = await PDFLib.PDFDocument.create();

            // 🔄 Step 3: Render each page as image
            for (let i = 1; i <= pdf.numPages; i++) {

                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2 });

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                const imgData = canvas.toDataURL("image/jpeg", 0.95);

                const jpgImage = await newPdf.embedJpg(imgData);
                const newPage = newPdf.addPage([
                    viewport.width,
                    viewport.height
                ]);

                newPage.drawImage(jpgImage, {
                    x: 0,
                    y: 0,
                    width: viewport.width,
                    height: viewport.height
                });
            }

            const pdfBytes = await newPdf.save();

            unlockedPdfBlob = new Blob([pdfBytes], {
                type: "application/pdf"
            });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("Unlock failed:", error);

            processingState.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");
            passwordError.classList.remove("hidden");

            if (error?.name === "PasswordException") {
                passwordError.innerText = "Incorrect password. Please try again.";
            } else {
                passwordError.innerText = "Failed to unlock PDF. Please check the file.";
            }
        }
    });

    // --------------------------------------------------
    // Reset / Start Over
    // --------------------------------------------------
    const resetUI = () => {
        pdfFile = null;
        unlockedPdfBlob = null;
        isEncrypted = false;
        pdfInput.value = "";
        passwordInput.value = "";
        passwordError.classList.add("hidden");
        
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");
    };

    resetBtn.addEventListener("click", resetUI);
    removeFileBtn.addEventListener("click", resetUI);

    // --------------------------------------------------
    // Download PDF
    // --------------------------------------------------
    downloadPdfBtn.addEventListener("click", () => {
        if (!unlockedPdfBlob) return;

        const url = URL.createObjectURL(unlockedPdfBlob);
        const link = document.createElement("a");
        link.href = url;
        
        const fileName = pdfFile ? pdfFile.name.replace(/\.[^/.]+$/, "") : "unlocked";
        link.download = `${fileName}-unlocked-mytoolkitpro.pdf`;
        
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
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
