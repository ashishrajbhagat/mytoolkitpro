/**
 * YantraStack - Rotate PDF Pages Logic
 * Dependencies: pdf-lib, pdf.js
 */

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "../assets/js/vendor/pdf.worker.min.js";

// Wait until the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");
    const uploadLoadingState = document.getElementById("upload-loading-state");
    const filePreviewArea = document.getElementById("file-preview-area");
    const pagesGrid = document.getElementById("pages-grid");
    const rotateLeftBtn = document.getElementById("rotate-all-left");
    const rotateRightBtn = document.getElementById("rotate-all-right");
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
    let pageRotations = []; 
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
        if (files.length > 0 && files[0].type === "application/pdf") {
            pdfInput.files = files;
            pdfInput.dispatchEvent(new Event('change'));
        }
    }, false);

    // Keyboard support for upload area
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
            showError(`❌ File too large (${(pdfFile.size / 1024 / 1024).toFixed(1)}MB). Max size is 100MB.`);
            return;
        }

        try {
            uploadArea.classList.add("hidden");
            uploadLoadingState.classList.remove("hidden");
            uploadErrorMessage.classList.add("hidden");

            pdfArrayBuffer = await pdfFile.arrayBuffer();
            
            const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer.slice(0) });
            const pdf = await loadingTask.promise;
            totalPages = pdf.numPages;

            pageRotations = new Array(totalPages).fill(0);
            await renderPageGrid(pdf);

            uploadLoadingState.classList.add("hidden");
            filePreviewArea.classList.remove("hidden");
        } catch (error) {
            console.error("Load error:", error);
            uploadLoadingState.classList.add("hidden");
            uploadArea.classList.remove("hidden");
            showError("❌ Failed to load PDF. It might be encrypted or invalid.");
        }
    });

    // --- Optimized Render Grid ---
    const renderPageGrid = async (pdf) => {
        pagesGrid.innerHTML = "";
        const renderPromises = [];

        for (let i = 1; i <= totalPages; i++) {
            renderPromises.push((async (pageIdx) => {
                const page = await pdf.getPage(pageIdx);
                const viewport = page.getViewport({ scale: 0.4 });

                const pageContainer = document.createElement("div");
                pageContainer.className = "relative flex flex-col items-center group bg-white p-2 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-fit self-start";
                
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                
                // Support for high DPI screens
                const ratio = window.devicePixelRatio || 1;
                canvas.width = viewport.width * ratio;
                canvas.height = viewport.height * ratio;
                canvas.style.display = "block";
                canvas.style.width = "100%";
                canvas.style.height = "auto";
                canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
                context.scale(ratio, ratio);

                canvas.className = "block w-full h-auto rounded border border-gray-100 transition-transform duration-300 bg-white origin-center";
                canvas.id = `page-canvas-${pageIdx - 1}`;

                const rotateBtn = document.createElement("button");
                rotateBtn.className = "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/80 backdrop-blur-sm text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl hover:scale-110 cursor-pointer z-10 hover:bg-primary";
                rotateBtn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`;
                rotateBtn.setAttribute("aria-label", "Rotate this page 90°");
                rotateBtn.onclick = () => rotateSinglePage(pageIdx - 1);

                const pageLabel = document.createElement("span");
                pageLabel.className = "mt-1 text-[10px] text-gray-500 font-semibold bg-gray-50/80 px-1.5 py-0.5 rounded-md z-20 relative";
                pageLabel.innerText = `Page ${pageIdx}`;

                pageContainer.append(canvas, rotateBtn, pageLabel);
                pagesGrid.appendChild(pageContainer);

                await page.render({ canvasContext: context, viewport }).promise;
            })(i));
        }
        await Promise.all(renderPromises);
    };

    // --- Rotation Logic ---
    const rotateSinglePage = (index) => {
        pageRotations[index] = (pageRotations[index] + 90) % 360;
        updatePageVisual(index);
    };

    const updatePageVisual = (index) => {
        const canvas = document.getElementById(`page-canvas-${index}`);
        if (canvas) {
            canvas.style.transform = `rotate(${pageRotations[index]}deg)`;
        }
    };

    rotateLeftBtn.onclick = () => {
        pageRotations = pageRotations.map(r => (r - 90 + 360) % 360);
        pageRotations.forEach((_, idx) => updatePageVisual(idx));
    };

    rotateRightBtn.onclick = () => {
        pageRotations = pageRotations.map(r => (r + 90) % 360);
        pageRotations.forEach((_, idx) => updatePageVisual(idx));
    };

    // --- Process & Save ---
    processBtn.addEventListener("click", async () => {
        if (!pdfArrayBuffer) return;

        try {
            filePreviewArea.classList.add("hidden");
            processingState.classList.remove("hidden");

            const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer.slice(0));
            const pages = pdfDoc.getPages();

            pages.forEach((page, idx) => {
                const rotationToAdd = pageRotations[idx];
                if (rotationToAdd !== 0) {
                    const existingRotation = page.getRotation().angle;
                    // Correctly handles cumulative rotation
                    page.setRotation(PDFLib.degrees(existingRotation + rotationToAdd));
                }
            });

            const pdfBytes = await pdfDoc.save();
            processedPdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth" });
        } catch (error) {
            console.error("Processing error:", error);
            alert("Failed to process PDF. Ensure it's not restricted.");
            resetUI();
        }
    });

    // --- UI Helpers ---
    const resetUI = () => {
        pdfFile = null;
        pdfArrayBuffer = null;
        processedPdfBlob = null;
        pageRotations = [];
        pdfInput.value = "";
        pagesGrid.innerHTML = "";
        
        filePreviewArea.classList.add("hidden");
        uploadLoadingState.classList.add("hidden");
        processingState.classList.add("hidden");
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        uploadErrorMessage.classList.add("hidden");
    };

    const showError = (msg) => {
        uploadErrorMessage.innerText = msg;
        uploadErrorMessage.classList.remove("hidden");
    };

    resetBtn.onclick = resetUI;
    removeFileBtn.onclick = resetUI;

    downloadPdfBtn.onclick = () => {
        if (!processedPdfBlob) return;
        const url = URL.createObjectURL(processedPdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${pdfFile?.name.replace(".pdf", "") || "document"}-rotated-yantrastack.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    };
});