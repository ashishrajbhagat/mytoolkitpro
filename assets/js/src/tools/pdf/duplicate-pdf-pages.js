/**
 * YantraStack - Duplicate PDF Pages Logic
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
    let pageCopies = new Map(); // Use a Map to store copy counts for each page index

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
            
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfArrayBuffer.slice(0)) });
            const pdf = await loadingTask.promise;
            
            pageCopies.clear();
            for (let i = 0; i < pdf.numPages; i++) {
                pageCopies.set(i, 1); // Each page starts with 1 copy (the original)
            }

            await renderPageGrid(pdf);

            loadingState.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");

        } catch (error) {
            console.error("Load error:", error);
            showUploadError("❌ Failed to load PDF. It might be corrupted or password protected.");
        }
    });

    const showUploadError = (msg) => {
        uploadErrorMessage.innerText = msg;
        uploadErrorMessage.classList.remove("hidden");
        loadingState.classList.add("hidden");
        uploadArea.classList.remove("hidden");
    };

    // --- Render Grid ---
    const renderPageGrid = async (pdf) => {
        pagesGrid.innerHTML = "";
        const renderPromises = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const pageIdx = i - 1;
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.4 });

            // --- Enhanced Container ---
            const container = document.createElement("div");
            container.className = "relative flex flex-col group bg-white rounded-xl border-2 border-transparent shadow-sm h-fit self-start overflow-hidden transition-all duration-200";
            container.id = `page-container-${pageIdx}`;
            
            const canvas = document.createElement("canvas");
            canvas.style.width = "100%";
            canvas.style.height = "auto";
            canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
            
            // --- Premium Control Panel ---
            const controls = document.createElement("div");
            controls.className = "absolute inset-x-0 bottom-0 bg-black/50 backdrop-blur-sm p-2 flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20";

            const minusBtn = document.createElement("button");
            minusBtn.className = "bg-white/80 text-primary rounded-full p-1.5 shadow-md hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed";
            minusBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4"></path></svg>`;
            minusBtn.setAttribute("aria-label", "Decrease copy count");

            const countDisplay = document.createElement("span");
            countDisplay.className = "text-sm font-bold text-white w-8 text-center";
            countDisplay.innerText = `${pageCopies.get(pageIdx)}`;

            const plusBtn = document.createElement("button");
            plusBtn.className = "bg-white/80 text-primary rounded-full p-1.5 shadow-md hover:bg-primary hover:text-white transition-all";
            plusBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>`;
            plusBtn.setAttribute("aria-label", "Increase copy count");

            controls.append(minusBtn, countDisplay, plusBtn);
            
            // --- Event Handlers for New Controls ---
            plusBtn.onclick = () => updateCopies(pageIdx, 1, countDisplay, minusBtn, container);
            minusBtn.onclick = () => updateCopies(pageIdx, -1, countDisplay, minusBtn, container);

            const updateCopies = (idx, delta, display, btn, cont) => {
                let current = pageCopies.get(idx) || 1;
                current = Math.max(1, current + delta); // Ensure count doesn't go below 1
                pageCopies.set(idx, current);
                display.innerText = `${current}`;
                btn.disabled = current <= 1;
                cont.classList.toggle('border-primary', current > 1);
            };

            container.append(canvas, controls);
            pagesGrid.appendChild(container);

            renderPromises.push((async () => {
                const context = canvas.getContext("2d");
                const ratio = window.devicePixelRatio || 1;
                canvas.width = viewport.width * ratio;
                canvas.height = viewport.height * ratio;
                context.scale(ratio, ratio);
                await page.render({ canvasContext: context, viewport }).promise;
            })());
        }
        await Promise.all(renderPromises);
    };

    // --- Process & Save ---
    processBtn.addEventListener("click", async () => {
        if (!pdfArrayBuffer) return;

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");

            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer.slice(0));
            const newPdf = await PDFLib.PDFDocument.create();

            const pageIndices = pdfDoc.getPageIndices();

            for (const pageIndex of pageIndices) {
                const numCopies = pageCopies.get(pageIndex) || 1;
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
                for (let j = 0; j < numCopies; j++) {
                    newPdf.addPage(copiedPage);
                }
            }

            const pdfBytes = await newPdf.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("Processing error:", error);
            alert("Error duplicating pages. Please try again.");
            resetUI();
        }
    });

    // --- UI Helpers ---
    const resetUI = () => {
        pdfFile = null;
        pdfArrayBuffer = null;
        processedPdfBlob = null;
        pageCopies.clear();
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
        link.download = `${name}-duplicated-yantrastack.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    });
});