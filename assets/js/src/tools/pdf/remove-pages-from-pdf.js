/**
 * YantraStack - Remove PDF Pages Logic
 * Dependencies: pdf-lib, pdf.js
 */

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "../assets/js/vendor/pdf.worker.min.js";

// Wait until DOM is fully loaded before executing script
document.addEventListener("DOMContentLoaded", () => {

    // DOM Elements
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");
    const loadingState = document.getElementById("loading-state");

    const filePreviewArea = document.getElementById("file-preview-area");
    const pagesGrid = document.getElementById("pages-grid");
    const removeFileBtn = document.getElementById("remove-file-btn");
    const processBtn = document.getElementById("process-action-btn");

    const processingState = document.getElementById("processing-state");
    const resultsArea = document.getElementById("results-area");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const resetBtn = document.getElementById("reset-btn");

    // State
    let pdfFile = null;
    let pdfArrayBuffer = null;
    let processedPdfBlob = null;
    let pagesToDelete = new Set();
    let totalPages = 0;

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    // --- Drag and Drop Logic ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
        uploadArea.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
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

    uploadArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pdfInput.click();
        }
    });

    // --- File Validation Helper ---
    const showUploadError = (msg) => {
        uploadErrorMessage.innerText = msg;
        uploadErrorMessage.classList.remove("hidden");
        loadingState.classList.add("hidden");
        uploadArea.classList.remove("hidden");
    };

    // --- File Selection ---
    pdfInput.addEventListener("change", async (e) => {
        pdfFile = e.target.files[0];
        if (!pdfFile) return;

        if (pdfFile.type !== "application/pdf") {
            showUploadError("❌ Only PDF files are allowed.");
            return;
        }

        if (pdfFile.size > MAX_FILE_SIZE) {
            showUploadError("❌ File too large. Max size is 100MB.");
            return;
        }

        try {
            uploadArea.classList.add("hidden");
            loadingState.classList.remove("hidden");
            uploadErrorMessage.classList.add("hidden");

            pdfArrayBuffer = await pdfFile.arrayBuffer();

            try {
                await PDFLib.PDFDocument.load(pdfArrayBuffer.slice(0), { ignoreEncryption: false });
            } catch (err) {
                if (err.message.includes("encrypted")) {
                    throw new Error("This PDF is password protected. Please unlock it first.");
                }
            }
            
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfArrayBuffer.slice(0)) });

            const pdf = await loadingTask.promise;
            totalPages = pdf.numPages;
            pagesToDelete.clear();

            await renderPageGrid(pdf);

            loadingState.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");

        } catch (error) {
            console.error("Load error:", error);
            loadingState.classList.add("hidden");
            uploadArea.classList.remove("hidden");
            uploadErrorMessage.classList.remove("hidden");
            uploadErrorMessage.innerText = "❌ Failed to load PDF. It might be corrupted or password protected.";
        }
    });

    // --- Render Grid ---
    const renderPageGrid = async (pdf) => {
        // Clear existing thumbnails and reset the grid
        pagesGrid.innerHTML = "";
        const renderPromises = [];

        for (let i = 1; i <= totalPages; i++) {
            const pageIdx = i - 1;

            // --- STEP 1: Get Page Data Immediately ---
            // We do this first so the browser knows the dimensions before creating the UI
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.4 });
            const ratio = window.devicePixelRatio || 1;

            // --- STEP 2: Create Branded Container ---
            const container = document.createElement("div");
            // h-fit and self-start ensure the card doesn't stretch vertically
            container.className = "relative flex flex-col group cursor-pointer bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 h-fit self-start overflow-hidden";
            container.setAttribute("role", "button");
            container.setAttribute("aria-pressed", "false");
            container.tabIndex = 0;

            // --- STEP 3: Create Canvas with Instant Proportions ---
            const canvas = document.createElement("canvas");
            canvas.id = `page-canvas-${pageIdx}`;
            
            // Apply display styles immediately to lock the height
            canvas.style.display = "block";
            canvas.style.width = "100%";
            canvas.style.height = "auto";
            canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
            canvas.className = "rounded border border-gray-100 bg-white";

            // --- STEP 4: Create Selection Overlay ---
            const overlay = document.createElement("div");
            // inset-0 ensures the red selection border perfectly matches the canvas edges
            overlay.className = "absolute inset-0 bg-red-500/10 backdrop-blur-[1px] hidden flex items-center justify-center border-2 border-red-500 z-10";
            overlay.innerHTML = `
                <div class="bg-red-600 text-white rounded-full p-2 shadow-lg scale-90 group-hover:scale-100 transition-transform">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>`;
            overlay.id = `page-overlay-${pageIdx}`;

            // --- STEP 5: Create Floating Page Badge ---
            const label = document.createElement("span");
            label.className = "absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-500 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md border border-gray-100 shadow-sm pointer-events-none z-20 uppercase tracking-tighter";
            label.innerText = `Page ${i}`;

            // Assemble and append to the grid
            container.append(canvas, overlay, label);
            pagesGrid.appendChild(container);

            // --- STEP 6: Setup Event Listeners ---
            const toggleFunc = () => togglePageDeletion(pageIdx, container);
            container.onclick = toggleFunc;
            container.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggleFunc());

            // --- STEP 7: Queue the High-Quality Render ---
            renderPromises.push((async () => {
                const context = canvas.getContext("2d");
                
                // Set internal resolution based on device DPI for crisp thumbnails
                canvas.width = viewport.width * ratio;
                canvas.height = viewport.height * ratio;
                
                // Scale the drawing context so 1 unit = 1 pixel on high-DPI screens
                context.scale(ratio, ratio);
                
                await page.render({ 
                    canvasContext: context, 
                    viewport: viewport 
                }).promise;
            })());
        }

        // Wait for all pages to finish rendering
        await Promise.all(renderPromises);
    };

    // --- Toggle Deletion Logic ---
    const togglePageDeletion = (index, container) => {
        const overlay = document.getElementById(`page-overlay-${index}`);
        const canvas = document.getElementById(`page-canvas-${index}`);

        if (pagesToDelete.has(index)) {
            pagesToDelete.delete(index);
            overlay.classList.add("hidden");
            canvas.classList.remove("opacity-50");
            container.setAttribute("aria-pressed", "false");
            container.classList.remove("border-red-500", "ring-2", "ring-red-100");
        } else {
            pagesToDelete.add(index);
            overlay.classList.remove("hidden");
            canvas.classList.add("opacity-50");
            container.setAttribute("aria-pressed", "true");
            container.classList.add("border-red-500", "ring-2", "ring-red-100");
        }
    };

    // --- Process & Save ---
    processBtn.addEventListener("click", async () => {
        if (!pdfArrayBuffer || pagesToDelete.size === 0) {
            alert(pagesToDelete.size === 0 ? "Please select at least one page to delete." : "No file loaded.");
            return;
        }

        if (pagesToDelete.size >= totalPages) {
            alert("You cannot delete all pages. A PDF must have at least one page.");
            return;
        }

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");

            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer.slice(0));
            
            // Delete pages in reverse order to avoid index shifting issues
            const sortedIndices = Array.from(pagesToDelete).sort((a, b) => b - a);
            
            for (const index of sortedIndices) {
                pdfDoc.removePage(index);
            }

            const pdfBytes = await pdfDoc.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("Processing error:", error);
            alert("Error deleting pages. Please try again.");
            resetUI();
        }
    });

    // --- UI Helpers ---
    const resetUI = () => {
        pdfFile = null;
        pdfArrayBuffer = null;
        processedPdfBlob = null;
        pagesToDelete = new Set();
        pdfInput.value = "";
        pagesGrid.innerHTML = "";
        
        loadingState.classList.add("hidden");
        filePreviewArea.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");
    };

    resetBtn.addEventListener("click", resetUI);
    removeFileBtn.addEventListener("click", resetUI);

    downloadPdfBtn.addEventListener("click", () => {
        if (!processedPdfBlob) return;
        const url = URL.createObjectURL(processedPdfBlob);
        const link = document.createElement("a");
        link.href = url;
        const name = pdfFile ? pdfFile.name.replace(".pdf", "") : "document";
        link.download = `${name}-edited-yantrastack.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    });
});
