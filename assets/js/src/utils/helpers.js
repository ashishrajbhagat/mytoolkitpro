/**
 * @fileoverview YantraStack Global UI Helpers
 * @description Provides reusable UI component logic such as Accordions,
 * ensuring consistent behavior across all tool modules.
 * @version 1.0.0
 * @author YantraStack
 */

/**
 * Initializes all accordion components found in the DOM.
 * Listens for click events on headers and handles the exclusive toggling 
 * (opening one item closes all others).
 * @function initAccordions
 * @returns {void}
 */
export function initAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    if (!accordionHeaders.length) return;

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const parent = header.parentElement;
            const content = parent.querySelector('.accordion-content');
            const icon = header.querySelector('svg');
            
            if (!content || !icon) return;

            // Check current state before toggling
            const isOpen = !content.classList.contains('hidden');

            // --- Exclusive Accordion Logic ---
            // Close all other open accordion contents
            document.querySelectorAll('.accordion-content').forEach(el => {
                if (el !== content) el.classList.add('hidden');
            });

            // Reset all other accordion icons
            document.querySelectorAll('.accordion-header svg').forEach(el => {
                if (el !== icon) el.classList.remove('rotate-180');
            });

            // Toggle current item
            if (isOpen) {
                content.classList.add('hidden');
                icon.classList.remove('rotate-180');
            } else {
                content.classList.remove('hidden');
                icon.classList.add('rotate-180');
            }
        });
    });
}

/**
 * Manually resets all accordions to the default "Landing" state.
 * Opens the first accordion item (usually 'Page & Layout') and 
 * ensures all subsequent sections are closed.
 * @function resetAccordions
 * @returns {void}
 */
export function resetAccordions() {
    const headers = document.querySelectorAll('.accordion-header');
    
    headers.forEach((header, index) => {
        // Find content relative to the header structure
        const content = header.nextElementSibling; 
        const icon = header.querySelector('svg');
        
        if (!content || !icon) return;

        if (index === 0) {
            // State: Open (Default for the primary settings panel)
            content.classList.remove('hidden');
            icon.classList.add('rotate-180');
        } else {
            // State: Closed (Default for advanced/secondary settings)
            content.classList.add('hidden');
            icon.classList.remove('rotate-180');
        }
    });
}