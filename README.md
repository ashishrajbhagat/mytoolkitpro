# ToolHub – Online PDF & Image Conversion Tools

ToolHub is a set of free, fast, and secure online tools to convert PDFs and images directly in your browser. No installation, no sign-up, and no watermark.

## Tools Included

- **PDF to JPG** – Convert PDF pages into high-quality JPG images.
- **JPG to PDF** – Merge multiple JPG/PNG images into a single PDF file.
- **Merge PDF** – Combine multiple PDF files into one PDF.

## How to Use

### PDF to JPG
1. Open `pdf-to-jpg.html`.
2. Upload your PDF file.
3. Click **Convert to JPG**.
4. Download the images individually or as a ZIP.

### JPG to PDF
1. Open `jpg-to-pdf.html`.
2. Upload JPG or PNG images.
3. Click **Convert to PDF**.
4. Download the resulting PDF.

### Merge PDF
1. Open `merge-pdf.html`.
2. Upload multiple PDF files.
3. Click **Merge PDFs**.
4. Download the merged PDF.

## Dependencies

- Tailwind CSS
- PDF.js
- jsPDF
- PDF-Lib
- JSZip

> All libraries are included via CDN for development. For production, installing locally is recommended.

## Project Structure
toolhub/
├─ index.html
├─ tools.html
├─ pdf-to-jpg.html
├─ jpg-to-pdf.html
├─ merge-pdf.html
├─ assets/
│ ├─ js/
│ │ ├─ pdf-to-jpg.js
│ │ ├─ jpg-to-pdf.js
│ │ └─ merge-pdf.js
│ └─ css/
│   └─ styles.css
└─ README.md

## Dependencies

- [Tailwind CSS](https://tailwindcss.com) – For styling
- [PDF.js](https://mozilla.github.io/pdf.js/) – For reading PDF files
- [jsPDF](https://github.com/parallax/jsPDF) – For generating PDFs from images
- [PDF-Lib](https://pdf-lib.js.org/) – For merging PDF files
- [JSZip](https://stuk.github.io/jszip/) – For generating ZIP files (used in PDF to JPG)

> **Note:** All libraries are loaded via CDN for quick development. For production, consider installing Tailwind CSS and libraries locally for better performance.

## Development

1. Clone the repository: git clone https://github.com/yourusername/toolhub.git
2. Open the HTML files in a browser for testing.

3. To build Tailwind CSS for production:
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
npx tailwindcss -i ./src/styles.css -o ./dist/styles.css --minify

## License

**MIT License** – free to use, modify, and distribute.

**ToolHub** – Fast, free, and secure browser-based PDF & image conversion tools.