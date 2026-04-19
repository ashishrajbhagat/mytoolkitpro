/**
 * minify-js.js
 * -------------------------------
 * This script recursively minifies all JavaScript files in the `assets/js/src` folder
 * (including subfolders like `tools/pdf`, `tools/image`, `tools/dev`, and `utils`) 
 * and outputs minified versions in `assets/js/dist` with corresponding source maps.
 *
 * Requirements:
 *  - Node.js
 *  - terser (already listed in devDependencies)
 *
 * Usage:
 * 1. Recommended (via npm script): 
 *      npm run build:js
 *    This will automatically run this script and generate minified JS files.
 *
 * 2. Direct Node execution:
 *      node scripts/minify-js.js
 *
 * Notes:
 *  - Skips already minified files ending with `.min.js`
 *  - Maintains directory structure in `dist` folder
 *  - Generates source maps for each minified file
 *  - You can include new JS files in `src` or its subfolders, and they will be automatically minified
 */

const fs = require('fs').promises;
const path = require('path');
const terser = require('terser');

(async () => {
  try {
    const projectRoot = path.join(__dirname, '..');
    const srcDir = path.join(projectRoot, 'assets', 'js', 'src');
    const outDir = path.join(projectRoot, 'assets', 'js', 'dist');

    // Ensure the output directory exists
    await fs.mkdir(outDir, { recursive: true });

    // Function to recursively get all JS files in src folder
    async function getJsFiles(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return getJsFiles(fullPath);
        if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.min.js')) return fullPath;
        return [];
      }));
      return files.flat();
    }

    const jsFiles = await getJsFiles(srcDir);

    // Minify each JS file concurrently
    const minifyTasks = jsFiles.map(async (srcPath) => {
      const code = await fs.readFile(srcPath, 'utf8');
      const relativePath = path.relative(srcDir, srcPath);
      const outPath = path.join(outDir, relativePath.replace(/\.js$/, '.min.js'));
      const mapPath = outPath + '.map';

      // Ensure output subfolder exists
      await fs.mkdir(path.dirname(outPath), { recursive: true });

      const result = await terser.minify(code, {
        compress: true,
        mangle: true,
        sourceMap: {
          filename: path.basename(outPath),
          url: path.basename(mapPath),
        },
      });

      if (result.error) throw result.error;

      // Write minified code and source map
      await Promise.all([
        fs.writeFile(outPath, result.code, 'utf8'),
        fs.writeFile(mapPath, result.map, 'utf8'),
      ]);

      console.log(`✅ Minified: ${relativePath} → ${path.relative(projectRoot, outPath)}`);
    });

    await Promise.all(minifyTasks);
    console.log('🎉 All JavaScript files minified successfully!');

  } catch (err) {
    console.error('❌ Minify failed:', err);
    process.exitCode = 1;
  }
})();