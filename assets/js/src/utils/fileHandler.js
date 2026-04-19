/**
 * @fileoverview MyToolKitPro File Handler Utility
 * @description Centralized logic for file validation, size constraints, 
 * and asynchronous reading of PDF and Image assets.
 * @version 1.0.0
 * @author MyToolKitPro
 */

/**
 * Validates and reads a single PDF file into an ArrayBuffer.
 * @async
 * @function handlePdfFile
 * @param {File} file - The file object from an input or drop event.
 * @param {Object} options - Validation constraints and UI callbacks.
 * @param {number} options.maxSizeMB - Maximum allowed file size in MB.
 * @param {number} options.largeFileMB - Threshold in MB to trigger a performance warning.
 * @param {Function} [options.showError] - Callback for displaying error messages.
 * @param {Function} [options.showWarning] - Callback for displaying warning messages.
 * @returns {Promise<Object>} success, file, buffer, and metadata if successful.
 */
export async function handlePdfFile(file, options = {}) {
    const {
        maxSizeMB,
        largeFileMB,
        showError = () => {},
        showWarning = () => {}
    } = options;

    const MAX_FILE_SIZE = maxSizeMB * 1024 * 1024;
    const LARGE_FILE_THRESHOLD = largeFileMB * 1024 * 1024;

    if (!file) {
        showError("❌ No file selected.");
        return { success: false };
    }

    if (file.type !== "application/pdf") {
        showError("❌ Please upload a valid PDF document.");
        return { success: false };
    }

    if (file.size > MAX_FILE_SIZE) {
        showError(
            `❌ File is too large (${(file.size / 1048576).toFixed(1)}MB). Max limit is ${maxSizeMB}MB.`
        );
        return { success: false };
    }

    if (file.size > LARGE_FILE_THRESHOLD) {
        showWarning("⚠️ Large file detected. Processing may take a few seconds.");
    }

    try {
        const buffer = await file.arrayBuffer();
        return {
            success: true,
            file,
            buffer,
            meta: {
                name: file.name,
                sizeMB: (file.size / 1048576).toFixed(2)
            }
        };
    } catch (error) {
        console.error("File Read Error:", error);
        showError("❌ Error reading file. It may be corrupted.");
        return { success: false };
    }
}

/**
 * Internal helper to read a file as a Base64 DataURL.
 * @private
 * @param {File} file 
 * @returns {Promise<string>} DataURL string.
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Validates and reads a single image file for previewing and PDF creation.
 * @async
 * @function handleImageFile
 * @param {File} file 
 * @param {Object} options 
 * @param {number} options.maxSizeMB - Maximum allowed size for a single image.
 * @param {string[]} [options.allowedTypes] - Array of accepted MIME types.
 * @returns {Promise<Object>} success status and image data.
 */
export async function handleImageFile(file, options = {}) {
    const {
        maxSizeMB, 
        allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    } = options;

    const MAX_FILE_SIZE = maxSizeMB * 1024 * 1024;

    if (!file) return { success: false, error: "No file selected." };
    if (!allowedTypes.includes(file.type)) return { success: false, error: "Invalid type." };
    if (file.size > MAX_FILE_SIZE) return { success: false, error: "Exceeds limit." };

    try {
        const dataUrl = await readFileAsDataURL(file);
        return {
            success: true,
            file,
            dataUrl,
            meta: { 
                name: file.name, 
                sizeMB: (file.size / 1048576).toFixed(2), 
                type: file.type 
            }
        };
    } catch (error) {
        return { success: false, error: "Read error." };
    }
}

/**
 * Processes a collection of images, enforcing batch-level and file-level constraints.
 * @async
 * @function handleImageBatch
 * @param {FileList|File[]} files - The batch of images to process.
 * @param {Object} options 
 * @param {number} options.maxBatchSizeMB - Hard limit for the total batch size.
 * @param {number} options.largeBatchThresholdMB - Threshold for triggering performance warnings.
 * @param {number} options.individualMaxSizeMB - Max size allowed for any single file in the batch.
 * @returns {Promise<Object>} result object containing valid files and status flags.
 */
export async function handleImageBatch(files, options = {}) {
    const {
        maxBatchSizeMB,
        largeBatchThresholdMB,
        individualMaxSizeMB
    } = options;

    const results = {
        valid: [],
        skippedCount: 0,
        totalSizeMB: 0,
        isLargeBatch: false,
        exceedsBatchLimit: false
    };

    const filesArray = Array.from(files);
    const totalIncomingBytes = filesArray.reduce((acc, f) => acc + f.size, 0);
    results.totalSizeMB = totalIncomingBytes / (1024 * 1024);

    if (results.totalSizeMB > maxBatchSizeMB) {
        results.exceedsBatchLimit = true;
        return results;
    }

    if (results.totalSizeMB > largeBatchThresholdMB) {
        results.isLargeBatch = true;
    }

    for (const file of filesArray) {
        const res = await handleImageFile(file, { maxSizeMB: individualMaxSizeMB });
        if (res.success) {
            results.valid.push(res);
        } else {
            results.skippedCount++;
        }
    }

    return results;
}