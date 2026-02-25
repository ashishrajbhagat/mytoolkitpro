document.addEventListener("DOMContentLoaded", () => {
  const imageInput = document.getElementById("imageFiles");
  const uploadMessage = document.getElementById("uploadMessage");
  const convertBtn = document.getElementById("convertBtn");
  const downloadPDF = document.getElementById("downloadPDF");
  const btnText = document.getElementById("btnText");
  const spinner = document.getElementById("spinner");
  const progressText = document.getElementById("progressText");

  let selectedFiles = [];

  // -------------------------
  // Utility: Convert file to Data URL
  // -------------------------
  const fileToDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // -------------------------
  // Update button state
  // -------------------------
  const setButtonState = (enabled) => {
    convertBtn.disabled = !enabled;
    convertBtn.classList.toggle("opacity-50", !enabled);
    convertBtn.classList.toggle("cursor-not-allowed", !enabled);
  };

  // -------------------------
  // Handle file selection
  // -------------------------
  imageInput.addEventListener("change", (e) => {
    selectedFiles = Array.from(e.target.files).filter((file) =>
      ["image/jpeg", "image/png"].includes(file.type)
    );

    if (!selectedFiles.length) return;

    uploadMessage.classList.remove("hidden");
    convertBtn.classList.remove("hidden");
    downloadPDF.classList.add("hidden");
    progressText.classList.add("hidden");
  });

  // -------------------------
  // Convert images to PDF
  // -------------------------
  convertBtn.addEventListener("click", async () => {
    if (!selectedFiles.length) return;

    // Start UI state
    btnText.innerText = "Converting...";
    spinner.classList.remove("hidden");
    setButtonState(false);
    progressText.classList.remove("hidden");
    progressText.innerText = "Preparing file...";

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      progressText.innerText = `Converting page ${i + 1} of ${selectedFiles.length}...`;

      const imgData = await fileToDataURL(file);

      await new Promise((resolve) => {
        const img = new Image();
        img.src = imgData;
        img.onload = () => {
          const imgWidth = pdf.internal.pageSize.getWidth();
          const imgHeight = (img.height * imgWidth) / img.width;
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
          resolve();
        };
      });
    }

    // Conversion complete
    progressText.innerText = "✅ Conversion Successful!";
    downloadPDF.classList.remove("hidden");
    downloadPDF.onclick = () => pdf.save("converted.pdf");

    // Reset button
    spinner.classList.add("hidden");
    btnText.innerText = "Convert Another File";
    setButtonState(true);

    convertBtn.onclick = () => location.reload();
  });
});