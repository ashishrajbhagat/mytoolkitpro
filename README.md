# MyToolKitPro

A comprehensive collection of **free, fast, and secure** online PDF and image conversion tools. All processing happens directly in your browser—no installation, no signup, and no watermarks.

## 🌟 Features

- **PDF to JPG Converter** - Convert PDF pages to high-quality JPG images
- **JPG to PDF Converter** - Transform images into professional PDF documents
- **Merge PDF Files** - Combine multiple PDF files into a single document
- **100% Browser-Based** - All processing happens locally on your device for maximum privacy
- **No Signup Required** - Start converting immediately without creating an account
- **Ad-Free & Watermark-Free** - Completely free to use with no hidden limitations
- **Mobile Responsive** - Works seamlessly on desktop, tablet, and mobile devices
- **Fast Performance** - Optimized for quick conversions without lag

## 🛠️ Available Tools

### 1. PDF to JPG
Convert PDF documents into JPG images. Perfect for sharing, archiving, or creating previews.

**Location:** `/tools/pdf-to-jpg.html`

### 2. JPG to PDF
Create professional PDF documents from JPEG images. Great for scanning documents or combining photos.

**Location:** `/tools/jpg-to-pdf.html`

### 3. Merge PDF
Combine multiple PDF files into a single, organized document.

**Location:** `/tools/merge-pdf.html`

## �️ Build & Development

### Scripts
Run these commands from the project root:

```bash
# CSS build
npm run build:css          # Build Tailwind CSS once
npm run watch:css          # Watch CSS files and rebuild

# JavaScript minify
npm run build:js           # Minify all JS files in assets/js/src
npm run watch:js           # Watch JS and auto-minify

# Full build & development
npm run build              # Build CSS and JS (one-time)
npm run dev                # Watch both CSS and JS (development mode)
```

### PWA & Favicons

Icons and logos are committed as **static assets** in `assets/img/`. These are used by the manifest in `assets/manifest.json` and your HTML headers for:
- Home screen installation icons (`icon-192.png`, `icon-512.png`)
- Apple devices (`apple-touch-icon.png`)
- Browser tabs and bookmarks (`favicon.ico`, `favicon.svg`, `favicon-16.png`, `favicon-32.png`)
- Social media previews (`og-image.png`)

### 2. Update the Project Structure Section
Replace your current `## 📁 Project Structure` section with this incredibly detailed, accurate tree. This includes your specific image files, the correct CSS layout, and the new JS `src`/`dist` layout!

```markdown
## 📁 Project Structure

```text
MyToolKitPro/
├── index.html              # Home page
├── tools.html              # Tools directory page
├── about.html              # About page
├── contact.html            # Contact page
├── privacy-policy.html     # Privacy policy
├── terms-of-service.html   # Terms of service
├── 404.html                # 404 error page
├── 500.html                # 500 error page
├── package.json            # Project dependencies & npm scripts
├── README.md               # This file
├── sitemap.xml             # SEO sitemap
├── robots.txt              # SEO robots.txt
├── assets/
│   ├── manifest.json       # PWA manifest file
│   ├── css/
│   │   ├── dist/
│   │   │   └── output.css          # Main compiled stylesheet
│   │   └── src/
│   │       ├── custom.css          # Custom overrides
│   │       └── input.css           # Tailwind input file
│   ├── img/
│   │   ├── apple-touch-icon.png    # iOS home screen icon
│   │   ├── favicon-16.png          # Small browser tab icon
│   │   ├── favicon-32.png          # Standard browser tab icon
│   │   ├── favicon.ico             # Legacy browser icon
│   │   ├── favicon.svg             # Modern vector tab icon
│   │   ├── icon-192.png            # PWA manifest icon
│   │   ├── icon-512.png            # PWA manifest large icon
│   │   ├── logo-horizontal.svg     # Main site logo (Header)
│   │   ├── logo.svg                # Square site logo
│   │   └── og-image.png            # Social media sharing preview
│   └── js/
│       ├── dist/                   # Minified production scripts
│       │   ├── main.min.js
│       │   ├── pdf-to-jpg.min.js
│       │   └── (other minified files...)
│       ├── src/                    # Raw developer source code
│       │   ├── main.js
│       │   ├── pdf-to-jpg.js
│       │   └── (other source files...)
│       └── vendor/                 # Third-party libraries
│           ├── jspdf.umd.min.js
│           ├── jszip.min.js
│           ├── pdf-lib.min.js
│           ├── pdf.min.js
│           └── pdf.worker.min.js
└── tools/
    ├── jpg-to-pdf.html
    ├── merge-pdf.html
    └── pdf-to-jpg.html

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software or dependencies needed for usage

### Installation & Development

1. **Clone or download the repository:**
   ```bash
   git clone <repository-url>
   cd MyToolKitPro
   ```

2. **Install development dependencies:**
   ```bash
   npm install
   ```

3. **Run build process (if needed):**
   ```bash
   npm run build
   ```

4. **Open in development server:**
   Because this project uses Web Workers for client-side PDF processing, it **must** be served over HTTP/HTTPS. Opening the files directly via the `file://` protocol will cause browser security errors.

   - **Option A (Recommended):** Use the **Live Server** extension in VS Code. Right-click `index.html` and select "Open with Live Server".
   - **Option B (Command Line):** Run a quick local server in your project root:
     ```bash
     npx serve
     # or
     npx http-server
     ```
   - **Option C (Python):** If you have Python installed:
     ```bash
     python -m http.server 8000
     ```

## 📦 Dependencies

### Production
- **PDF.js** - PDF viewing and manipulation
- **jsPDF** - Generate PDFs in JavaScript
- **pdf-lib** - Advanced PDF manipulation library
- **JSZip** - ZIP file creation (for handling multiple files)

### Development
- **Tailwind CSS** v4.2.1 - Utility-first CSS framework
- **PostCSS** - CSS transformation tool
- **Autoprefixer** - Vendor prefix management

## 🔐 Privacy & Security

- **No Data Collection** - We don't store or transmit your files to any servers
- **Local Processing** - All conversions happen completely within your browser
- **Privacy-Focused Analytics** - We use standard Google Analytics (GA4) solely to understand which tools are most popular and improve the site. All file processing still happens 100% locally on your device, and we never see, store, or transmit your actual documents
- **Open Source** - Code transparency for security audits

## 🎨 Styling & Build System

The project uses **Tailwind CSS v4** for styling with a modern, zero-config setup:
- **Configuration:** Handled via the `@theme` directive directly in CSS.
- **Input:** `assets/css/src/input.css`
- **Output:** `assets/css/dist/output.css`
- **Custom CSS:** `assets/css/src/custom.css`

### Building Styles

```bash
# One-time build
npm run build:css

# Watch mode (auto-rebuild on changes)
npm run watch:css
```

### JavaScript Minification

All JS files in `assets/js/src/` are automatically minified to `assets/js/dist/`:
- **Entry:** `assets/js/src/*.js`
- **Output:** `assets/js/dist/*.min.js`
- **Tool:** Terser with source maps
- **Build Command:** `npm run build:js`

## 📱 Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome for Android)

## 🌐 SEO

- Sitemap: `sitemap.xml`
- Robots: `robots.txt`
- Meta tags optimized for search engines
- Canonical URLs configured
- Schema.org structured data

## � Deployment

The site is a **static HTML/CSS/JS** application deployable to any web host:

### Deployment Options

1. **Netlify** (recommended)
   ```bash
   npm run build
   # Connect GitHub repo → auto-deploys
   ```

2. **Vercel**
   - Connect GitHub → auto-deploys on push

3. **Traditional Hosting** (Apache, Nginx, cPanel, etc.)
   - Upload all files via FTP/SSH
   - No build step required on server

4. **GitHub Pages**
   ```bash
   # Push to gh-pages branch
   ```

### Security Headers (Netlify Configured)
Security headers are automatically applied via the `_headers` file located at the root of the project.

The Content-Security-Policy (CSP) has been custom-tailored to protect the site while explicitly allowing local file processing (via Web Workers and Blob URLs) and Google Analytics 4 tracking:
```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' [https://www.googletagmanager.com](https://www.googletagmanager.com); connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com; img-src 'self' data: blob:; worker-src 'self' blob:;
```

## 📊 Performance

### File Size Limits
- **PDF Conversion:** Depends on browser memory (typically 100-500MB)
- **Image Conversion:** Recommended max 50MB per file
- **Merge PDFs:** Test with your target audience's device capabilities

### Optimization
- All JS is minified (`assets/js/dist/*.min.js`)
- CSS is generated and minified via Tailwind
- No external API calls - all processing is local
- Lazy loading for third-party libraries

### Network Performance
- Initial load: ~50-100KB (gzipped)
- Vendor libraries: ~500KB-1MB (loaded on-demand)
- No API backend required

## ♿ Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Semantic HTML structure
- Color contrast meets WCAG AA standards
- Form inputs properly labeled

## 🔄 PWA (Progressive Web App)

MyToolKitPro works offline and can be installed as an app:

1. **Install on Desktop/Mobile:**
   - Open site in Chrome/Edge
   - Click "Install" or "Add to Home Screen"

2. **Offline Access:**
   - All tools work without internet (after first load)
   - Files processed locally in browser

3. **Icon & Splash Screen:**
   - Auto-generated from `assets/img/icon-*.png`
   - Appears on installation

- **Home** (`index.html`) - Landing page with tool highlights
- **Tools** (`tools.html`) - Complete list of available tools
- **About** (`about.html`) - Information about MyToolKitPro
- **Contact** (`contact.html`) - Contact information
- **Privacy Policy** (`privacy-policy.html`) - Data privacy information
- **Terms of Service** (`terms-of-service.html`) - Usage terms

## 🐛 Troubleshooting

### Tools not working in browser
- Clear browser cache and reload (Ctrl+Shift+Delete)
- Try a different browser
- Ensure JavaScript is enabled
- Check browser console for errors (F12)

### File size limits
- Browser memory limitations may apply (typically 100-500MB)
- Try working with smaller files if experiencing issues
- Close other tabs to free up memory

### Build issues
```bash
# Clear node_modules and reinstall
rm -r node_modules
npm install

# Clean build
npm run build
```

### Styling issues
- Ensure `npm run build:css` completed successfully
- Check `assets/css/dist/output.css` exists and is referenced in HTML
- Clear browser cache (Ctrl+Shift+Delete)

## 📞 Support

For issues, suggestions, or feedback, please check the contact page or open an issue in the repository.

## 📜 License

This project is licensed under the ISC License. See the LICENSE file for details.

## 👨‍💻 Author

**MyToolKitPro** - A free toolkit for PDF and image conversion

---

**Last Updated:** February 2026

**Version:** 1.0.0

Made with ❤️ for productivity and simplicity.
