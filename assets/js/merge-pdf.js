// merge-pdf.js

document.addEventListener("DOMContentLoaded", () => {
  const pdfInput = document.getElementById("pdfFiles");
  const uploadMessage = document.getElementById("uploadMessage");
  const mergeBtn = document.getElementById("mergeBtn");
  const downloadPDF = document.getElementById("downloadPDF");
  const btnText = document.getElementById("btnText");
  const spinner = document.getElementById("spinner");
  const progressText = document.getElementById("progressText");

  let selectedFiles = [];

  // Handle file selection
  pdfInput.addEventListener("change", (e) => {
    selectedFiles = Array.from(e.target.files).filter(file => file.type === "application/pdf");

    if (selectedFiles.length > 0) {
      uploadMessage.classList.remove("hidden");
      mergeBtn.classList.remove("hidden");
      downloadPDF.classList.add("hidden");
      progressText.classList.add("hidden");
    }
  });

  // Merge PDFs
  mergeBtn.addEventListener("click", async () => {
    if (selectedFiles.length === 0) return;

    // Start loading state
    btnText.innerText = "Merging...";
    spinner.classList.remove("hidden");
    mergeBtn.disabled = true;
    mergeBtn.classList.add("opacity-50", "cursor-not-allowed");
    progressText.classList.remove("hidden");
    progressText.innerText = "Preparing files...";

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();

      for (let i = 0; i < selectedFiles.length; i++) {
        progressText.innerText = `Merging file ${i + 1} of ${selectedFiles.length}...`;

        const file = selectedFiles[i];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);

        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });

      downloadPDF.classList.remove("hidden");
      downloadPDF.onclick = () => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "merged.pdf";
        link.click();
      };

      progressText.innerText = "✅ Merge Successful!";
    } catch (error) {
      console.error(error);
      progressText.innerText = "❌ Error merging PDFs. Try again.";
    } finally {
      // Reset button state
      spinner.classList.add("hidden");
      mergeBtn.disabled = false;
      mergeBtn.classList.remove("opacity-50", "cursor-not-allowed");
      btnText.innerText = "Merge PDFs";
    }
  });
});