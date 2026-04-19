/**
 * @fileoverview YantraStack Drag & Drop Utility
 * @description Provides a centralized, reusable handler for file drag-and-drop 
 * interactions, managing visual states and event propagation.
 * @version 1.0.0
 * @author YantraStack
 */

/**
 * Initializes drag-and-drop functionality on a specific DOM element.
 * * @function setupDragDrop
 * @param {HTMLElement} target - The DOM element to act as the drop zone.
 * @param {Object} options - Configuration options for the handler.
 * @param {string} [options.hoverClass='border-primary/80 bg-primary/10'] - Tailwind/CSS classes to apply on hover.
 * @param {string} [options.defaultClass='border-slate-400 bg-slate-500/10'] - Tailwind/CSS classes to revert to.
 * @param {Function} [options.onFilesDropped] - Callback function that receives the FileList object.
 * @returns {void}
 */
export function setupDragDrop(target, options = {}) {
    if (!target) return;

    // --- Configuration Defaults ---
    const {
        hoverClass = 'border-primary/80 bg-primary/10',
        defaultClass = 'border-slate-400 bg-slate-500/10',
        onFilesDropped = () => {}
    } = options;

    /**
     * Prevents browser default actions and stops event bubbling.
     * @param {Event} e - The drag/drop event object.
     */
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    /**
     * Applies the active visual state when files are dragged over the target.
     */
    const addHover = () => {
        target.classList.add(...hoverClass.split(' '));
        target.classList.remove(...defaultClass.split(' '));
    };

    /**
     * Reverts to the default visual state when files leave the target or are dropped.
     */
    const removeHover = () => {
        target.classList.remove(...hoverClass.split(' '));
        target.classList.add(...defaultClass.split(' '));
    };

    // --- Event Listener Registration ---
    
    // Block default browser behavior (like opening the file in the tab)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        target.addEventListener(eventName, preventDefaults, false);
    });

    // Handle visual hover effects
    ['dragenter', 'dragover'].forEach(eventName => {
        target.addEventListener(eventName, addHover, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        target.addEventListener(eventName, removeHover, false);
    });

    // Handle the actual file drop
    target.addEventListener('drop', (e) => {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            onFilesDropped(files);
        }
    }, false);
}