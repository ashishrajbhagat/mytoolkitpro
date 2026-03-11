/**
 * MyToolKitPro - Organize PDF Pages Logic
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
    let totalPages = 0;
    let draggedItem = null;

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    // --- Drag and Drop Logic (File Upload) ---
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

    // --- File Selection ---
    pdfInput.addEventListener("change", async (e) => {
        pdfFile = e.target.files[0];
        if (!pdfFile) return;

        if (pdfFile.size > MAX_FILE_SIZE) {
            uploadErrorMessage.classList.remove("hidden");
            uploadErrorMessage.innerText = "❌ File too large. Max size is 100MB.";
            return;
        }

        try {
            uploadArea.classList.add("hidden");
            loadingState.classList.remove("hidden");
            uploadErrorMessage.classList.add("hidden");

            pdfArrayBuffer = await pdfFile.arrayBuffer();
            
            // Load PDF using PDF.js for rendering thumbnails
            const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer.slice(0) });
            const pdf = await loadingTask.promise;
            totalPages = pdf.numPages;

            // Render Grid
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
        pagesGrid.innerHTML = "";
        const renderPromises = [];

        for (let i = 1; i <= totalPages; i++) {
            const pageIdx = i - 1;

            // --- STEP 1: Get Viewport First ---
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.4 });
            const ratio = window.devicePixelRatio || 1;

            // --- STEP 2: Create Container ---
            const pageContainer = document.createElement("div");
            // Added h-fit and self-start to prevent stretching during reordering
            pageContainer.className = "page-container relative flex flex-col group cursor-move bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 h-fit self-start overflow-hidden";
            pageContainer.draggable = true;
            pageContainer.dataset.pageIndex = pageIdx; // Store original index for processing
            
            // --- STEP 3: Create Canvas with Aspect Ratio ---
            const canvas = document.createElement("canvas");
            canvas.id = `page-canvas-${pageIdx}`;
            
            // Lock dimensions immediately
            canvas.style.display = "block";
            canvas.style.width = "100%";
            canvas.style.height = "auto";
            canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
            canvas.className = "rounded border border-gray-100 pointer-events-none bg-white";

            // --- STEP 4: Create Floating Badge ---
            const pageLabel = document.createElement("span");
            pageLabel.className = "absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-500 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md border border-gray-100 shadow-sm pointer-events-none z-20 uppercase tracking-tighter";
            pageLabel.innerText = `PAGE ${i}`;

            pageContainer.appendChild(canvas);
            pageContainer.appendChild(pageLabel);
            pagesGrid.appendChild(pageContainer);

            // Attach Reordering Events
            pageContainer.addEventListener('dragstart', handleDragStart);
            pageContainer.addEventListener('dragover', handleDragOver);
            pageContainer.addEventListener('drop', handleDrop);
            pageContainer.addEventListener('dragend', handleDragEnd);

            // --- STEP 5: Queue High-Quality Render ---
            renderPromises.push((async () => {
                const context = canvas.getContext("2d");
                canvas.width = viewport.width * ratio;
                canvas.height = viewport.height * ratio;
                context.scale(ratio, ratio);

                await page.render({ canvasContext: context, viewport }).promise;
            })());
        }
        await Promise.all(renderPromises);
    };

    // --- Drag and Drop Reordering Logic ---
    function handleDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        this.classList.add('opacity-40', 'scale-95');
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (draggedItem !== this) {
            const items = Array.from(pagesGrid.children);
            const draggedIdx = items.indexOf(draggedItem);
            const droppedIdx = items.indexOf(this);

            if (draggedIdx < droppedIdx) {
                this.after(draggedItem);
            } else {
                this.before(draggedItem);
            }
        }
        return false;
    }

    function handleDragEnd() {
        this.classList.remove('opacity-40', 'scale-95');
        draggedItem = null;
    }

    // --- Process & Save ---
    processBtn.addEventListener("click", async () => {
        if (!pdfArrayBuffer) return;

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");

            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer.slice(0));
            const newPdf = await PDFLib.PDFDocument.create();

            // Get new order from DOM
            const pageContainers = document.querySelectorAll('.page-container');
            const newOrderIndices = Array.from(pageContainers).map(container => parseInt(container.dataset.pageIndex));

            // Copy pages in new order
            const copiedPages = await newPdf.copyPages(pdfDoc, newOrderIndices);
            copiedPages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("Processing error:", error);
            alert("Error organizing PDF. Please try again.");
            resetUI();
        }
    });

    // --- UI Helpers ---
    const resetUI = () => {
        pdfFile = null;
        pdfArrayBuffer = null;
        processedPdfBlob = null;
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
        link.download = `${name}-organized-mytoolkitpro.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    });
});
