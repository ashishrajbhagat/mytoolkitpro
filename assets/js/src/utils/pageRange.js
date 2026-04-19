/**
 * @fileoverview YantraStack Page Range Utility
 * @description Logic for parsing, validating, and filtering page selections.
 * Supports complex strings, keywords (odd, even, end), and exclusions.
 * @version 1.0.0
 * @author YantraStack
 */

/**
 * Parses user input strings into a sorted array of unique page numbers.
 * @function parsePageRange
 * @param {string} [rangeStr=''] - Input string for pages to include (e.g., "1-5, odd").
 * @param {string} [excludeStr=''] - Input string for pages to remove (e.g., "2, 10-end").
 * @param {number} [totalPages=1] - The maximum number of pages available in the document.
 * @returns {Object} result - The parsing result.
 * @returns {number[]} result.pages - Array of 1-based integers representing selected pages.
 * @returns {string[]} result.warnings - Array of strings describing validation or parsing issues.
 */
export function parsePageRange(rangeStr = '', excludeStr = '', totalPages = 1) {
    const warnings = [];

    // ---------------- VALIDATION ----------------

    /**
     * Validates if a string matches the accepted range syntax.
     * Regex breakdown: Allows digits, ranges (N-N), N-end, 'odd', and 'even', comma-separated.
     * @param {string} str 
     * @returns {boolean}
     */
    const isValidInput = (str) => {
        if (!str || str.trim() === '') return true;
        const regex = /^\s*(\d+(-(\d+|end))?|odd|even)(\s*,\s*(\d+(-(\d+|end))?|odd|even))*\s*$/i;
        return regex.test(str);
    };

    if (!isValidInput(rangeStr)) warnings.push("Invalid range format.");
    if (!isValidInput(excludeStr)) warnings.push("Invalid exclude format.");

    // ---------------- HELPERS ----------------

    /**
     * Converts a string part to an integer or handles keywords.
     * @param {string} val 
     * @returns {number|null}
     */
    const normalize = (val) => {
        val = val.trim().toLowerCase();
        if (val === 'end') return totalPages;
        const num = Number(val);
        return Number.isInteger(num) ? num : null;
    };

    /**
     * Iterates through a range and adds integers to a Set.
     * @param {Set} set 
     * @param {number} start 
     * @param {number} end 
     */
    const addRange = (set, start, end) => {
        if (start > end) {
            warnings.push(`Invalid range: ${start}-${end}`);
            return;
        }
        if (start < 1 || end > totalPages) {
            // Internal safety; logic allows the main loop to filter out-of-bounds
            return; 
        }
        for (let i = start; i <= end; i++) {
            set.add(i);
        }
    };

    /**
     * Parses a string input into a Set of unique page numbers.
     * @param {string} str 
     * @param {boolean} isExclude - If true, returns empty set for empty input. 
     * If false, returns all pages for empty input.
     * @returns {Set<number>}
     */
    const parseInput = (str, isExclude = false) => {
        const set = new Set();

        if (!str || str.trim() === '') {
            if (isExclude) return set;
            // Default behavior for empty 'Include' string is to select all pages
            for (let i = 1; i <= totalPages; i++) set.add(i);
            return set;
        }

        const parts = str.split(',');
        parts.forEach(part => {
            part = part.trim().toLowerCase();
            if (!part) return;

            // Handle Keyword: EVEN
            if (part === 'even') {
                for (let i = 2; i <= totalPages; i += 2) set.add(i);
                return;
            }

            // Handle Keyword: ODD
            if (part === 'odd') {
                for (let i = 1; i <= totalPages; i += 2) set.add(i);
                return;
            }

            // Handle Range Syntax (N-N)
            if (part.includes('-')) {
                const split = part.split('-');
                if (split.length !== 2) {
                    warnings.push(`Invalid range: "${part}"`);
                    return;
                }

                const [startRaw, endRaw] = split;
                const start = normalize(startRaw);
                const end = normalize(endRaw);
                if (start == null || end == null) {
                    warnings.push(`Invalid range: "${part}"`);
                    return;
                }
                addRange(set, start, end);
                return;
            }

            // Handle Single Page Number
            const num = normalize(part);
            if (num == null) {
                warnings.push(`Invalid range: "${part}"`);
                return;
            }

            if (num < 1 || num > totalPages) {
                warnings.push(`Page ${num} is out of range (1-${totalPages})`);
                return;
            }

            set.add(num);
        });

        return set;
    };

    // ---------------- MAIN LOGIC ----------------

    const includeSet = parseInput(rangeStr, false);
    const excludeSet = parseInput(excludeStr, true);

    // Subtract Exclusions from the Selection
    excludeSet.forEach(p => includeSet.delete(p));

    // Cleanup: Sort and ensure strictly within bounds
    const pages = [...includeSet]
        .sort((a, b) => a - b)
        .filter(p => p >= 1 && p <= totalPages);

    if (pages.length === 0) {
        warnings.push("No pages selected.");
    }

    return { pages, warnings };
}