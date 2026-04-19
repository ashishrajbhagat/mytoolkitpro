/**
 * YantraStack - PDF Thumbnail Generator Logic
 * Dependencies: pdf.js (for rendering), jszip (for downloading all)
 */

pdfjsLib.GlobalWorkerOptions.workerSrc = "../assets/js/vendor/pdf.worker.min.js";

// Wait until DOM is fully loaded before executing script
document.addEventListener("DOMContentLoaded", () => {
    const uploadArea = document.getElementById("upload-area");
    const pdfInput = document.getElementById("pdfFile");
    const uploadErrorMessage = document.getElementById("upload-error-message");
    const processingState = document.getElementById("processing-state");
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    const resultsArea = document.getElementById("results-area");
    const downloadAllBtn = document.getElementById("download-all-btn");
    const resetBtn = document.getElementById("reset-btn");

    let pdfFile = null;
    let thumbnailBlobs = [];

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    // Drag and Drop Logic
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
        uploadArea.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
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
    });

    pdfInput.addEventListener("change", async (e) => {
        pdfFile = e.target.files[0];
        if (!pdfFile || pdfFile.type !== "application/pdf") {
            showError("❌ Please upload a valid PDF file.");
            return;
        }
        if (pdfFile.size > MAX_FILE_SIZE) {
            showError("❌ File too large (max 100MB).");
            return;
        }

        try {
            uploadArea.classList.add("hidden");
            processingState.classList.remove("hidden");
            thumbnailBlobs = [];

            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
            const totalPages = pdf.numPages;

            for (let i = 1; i <= totalPages; i++) {
                progressText.innerText = `Generating thumbnail for page ${i} of ${totalPages}...`;
                const percent = Math.round((i / totalPages) * 100);
                progressBar.style.width = `${percent}%`;

                const page = await pdf.getPage(i);
                // Thumbnail scale (approx 300px width)
                const viewport = page.getViewport({ scale: 0.5 });
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
                thumbnailBlobs.push({ name: `page-${i}.jpg`, blob });
            }

            processingState.classList.add("hidden");
            resultsArea.classList.remove("hidden");
            resultsArea.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error(error);
            showError("❌ Failed to process PDF. It might be password protected.");
        }
    });

    downloadAllBtn.addEventListener("click", async () => {
        const zip = new JSZip();
        thumbnailBlobs.forEach(item => zip.file(item.name, item.blob));
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${pdfFile.name.replace(".pdf", "")}-thumbnails.zip`;
        link.click();
    });

    resetBtn.addEventListener("click", () => {
        pdfInput.value = "";
        resultsArea.classList.add("hidden");
        uploadArea.classList.remove("hidden");
        progressBar.style.width = "0%";
    });

    function showError(msg) {
        uploadErrorMessage.innerText = msg;
        uploadErrorMessage.classList.remove("hidden");
        processingState.classList.add("hidden");
        uploadArea.classList.remove("hidden");
    }
});