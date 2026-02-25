document.addEventListener("DOMContentLoaded", () => {
  const pdfInput = document.getElementById("pdfFile");
  const uploadMessage = document.getElementById("uploadMessage");
  const convertBtn = document.getElementById("convertBtn");
  const downloadSingle = document.getElementById("downloadSingle");
  const downloadZip = document.getElementById("downloadZip");
  const btnText = document.getElementById("btnText");
  const spinner = document.getElementById("spinner");
  const progressText = document.getElementById("progressText");

  let pdfFile = null;
  let images = [];

  // -------------------------
  // Button state helper
  // -------------------------
  const setButtonState = (enabled) => {
    convertBtn.disabled = !enabled;
    convertBtn.classList.toggle("opacity-50", !enabled);
    convertBtn.classList.toggle("cursor-not-allowed", !enabled);
  };

  // -------------------------
  // Handle PDF file selection
  // -------------------------
  pdfInput.addEventListener("change", (e) => {
    pdfFile = e.target.files[0];
    if (!pdfFile) return;

    uploadMessage.classList.remove("hidden");
    convertBtn.classList.remove("hidden");

    progressText.classList.add("hidden");
    downloadSingle.classList.add("hidden");
    downloadZip.classList.add("hidden");
  });

  // -------------------------
  // Convert PDF to JPG images
  // -------------------------
  convertBtn.addEventListener("click", async () => {
    if (!pdfFile) return;

    // Reset UI
    progressText.classList.remove("hidden");
    progressText.innerText = "Preparing file...";
    downloadSingle.classList.add("hidden");
    downloadZip.classList.add("hidden");

    // Start loading state
    btnText.innerText = "Converting...";
    spinner.classList.remove("hidden");
    setButtonState(false);

    const fileReader = new FileReader();
    fileReader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;
      images = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        progressText.innerText = `Converting page ${pageNum} of ${pdf.numPages}...`;

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

        images.push(canvas.toDataURL("image/jpeg"));
      }

      // Conversion complete
      progressText.innerText = "✅ Conversion Successful!";
      spinner.classList.add("hidden");
      setButtonState(true);

      if (images.length === 1) {
        downloadSingle.classList.remove("hidden");
      } else if (images.length > 1) {
        downloadZip.classList.remove("hidden");
      }

      btnText.innerText = "Convert Another File";
      convertBtn.onclick = () => location.reload();
    };

    fileReader.readAsArrayBuffer(pdfFile);
  });

  // -------------------------
  // Download single image
  // -------------------------
  downloadSingle.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = images[0];
    link.download = "converted.jpg";
    link.click();
  });

  // -------------------------
  // Download all images as ZIP
  // -------------------------
  downloadZip.addEventListener("click", async () => {
    const zip = new JSZip();

    images.forEach((img, index) => {
      const base64Data = img.split(",")[1];
      zip.file(`page-${index + 1}.jpg`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "converted-images.zip";
    link.click();
  });
});