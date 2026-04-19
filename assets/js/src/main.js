/**
 * YantraStack - Main Application Script
 * * Includes:
 * 1. UI Components (Mobile Menu, Dynamic Footer)
 * 2. FAQ Accordion Logic
 * 3. Command Palette / Search System
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================
       1. UI & LAYOUT UTILITIES
       ========================================== */
    
    // Mobile menu elements
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // Footer elements
    const yearDisplay = document.getElementById('year');

    /**
     * Toggles the visibility of the mobile navigation menu
     */
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    /**
     * Auto-updates the copyright year in the footer
     */
    if (yearDisplay) {
        yearDisplay.textContent = new Date().getFullYear();
    }


    /* ==========================================
       2. FAQ ACCORDION LOGIC
       ========================================== */
       
    // FAQ buttons elements
    const faqButtons = document.querySelectorAll('.faq-toggle');

    /**
     * Handles the expanding/collapsing of FAQ items.
     * Implements "Single Open" logic (closing others when one opens).
     */
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.faq-toggle');
        if (!btn) return;

        e.preventDefault();

        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        const targetContent = document.getElementById(btn.getAttribute('aria-controls'));

        // Only loop if we are opening a new item
        if (!isExpanded) {
            faqButtons.forEach(other => {
                if (other !== btn && other.getAttribute('aria-expanded') === 'true') {
                    other.setAttribute('aria-expanded', 'false');
                    document.getElementById(other.getAttribute('aria-controls'))?.classList.add('hidden');
                    other.querySelector('svg')?.classList.remove('rotate-180');
                }
            });
        }

        // Toggle current item
        const newState = !isExpanded;
        btn.setAttribute('aria-expanded', newState);
        targetContent?.classList.toggle('hidden', !newState);
        btn.querySelector('svg')?.classList.toggle('rotate-180', newState);
    });


    /* ==========================================
       3. COMMAND PALETTE / SEARCH SYSTEM
       ========================================== */

    // Search elements
    const openSearchBtn = document.getElementById('open-search-btn');
    const searchShortcutHint = document.getElementById('search-shortcut');
    const palette = document.getElementById('command-palette');
    const backdrop = document.getElementById('modal-backdrop');
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    const resultsList = document.getElementById('search-results-list');
    const resultCountLabel = document.getElementById('result-count');

    // Internal Search State
    let allTools = [];
    let filteredResults = [];
    let activeIndex = 0;
    let currentFilter = 'all';

    /**
     * Fetches the tools database and initializes the search
     */
    async function initSearch() {
        try {
            const response = await fetch('/assets/data/tools.json');
            allTools = await response.json();
        } catch (error) {
            console.error("Search system error: Could not load tools database.", error);
        }
    }

    /**
     * Opens the search modal and prepares input
     */
    const openModal = () => {
        if (!palette) return;
        palette.classList.remove('hidden');
        searchInput.focus();
        renderResults();
    };

    /**
     * Closes search modal and resets input state
     */
    const closeModal = () => {
        if (!palette) return;
        palette.classList.add('hidden');
        searchInput.value = '';
        activeIndex = 0;
    };

    /**
     * Logic for filtering tools and rendering them to the results list
     */
    function renderResults() {
        if (!resultsList) return;
        
        const query = searchInput.value.toLowerCase().trim();
        resultsList.innerHTML = '';

        // Filter based on category and keywords/name
        filteredResults = allTools.filter(t => {
            const matchesFilter = currentFilter === 'all' || t.category === currentFilter;
            const matchesSearch = t.name.toLowerCase().includes(query) || 
                                  t.keywords.some(k => k.toLowerCase().includes(query));
            return matchesFilter && matchesSearch;
        });

        if (filteredResults.length === 0) {
            resultsList.innerHTML = `<div class="p-8 text-center text-gray-500 text-base">No results found...</div>`;
        } else {
            filteredResults.forEach((tool, idx) => {
                const item = document.createElement('div');
                item.className = `search-item flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all mb-1 group border-l-4 border-transparent`;
                
                item.innerHTML = `
                    <div class="text-2xl">${tool.icon}</div>
                    <div>
                        <div class="text-base font-bold text-gray-900 group-hover:text-primary">${tool.name}</div>
                        <div class="text-sm font-medium text-gray-500">${tool.desc}</div>
                    </div>
                `;

                // Hover updates active index for keyboard sync
                item.onmouseenter = () => {
                    activeIndex = idx;
                    updateSelectionUI();
                };

                // Navigation
                item.onclick = () => {
                    window.location.href = '/' + tool.url;
                };

                resultsList.appendChild(item);
            });

            updateSelectionUI();
        }

        // Update results counter
        if (resultCountLabel) {
            resultCountLabel.innerText = `${filteredResults.length} tools`;
        }
    }

    /**
     * Manages visual classes for the active selection (keyboard/hover)
     */
    function updateSelectionUI() {
        const items = resultsList.querySelectorAll('.search-item');

        items.forEach((el, i) => {
            if (i === activeIndex) {
                el.classList.add('bg-primary/10', 'border-primary');
                el.classList.remove('border-transparent');
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                el.classList.remove('bg-primary/10', 'border-primary');
                el.classList.add('border-transparent');
            }
        });
    }

    /* --- Keyboard & Event Listeners --- */

    // Detect OS for shortcut hint (⌘ K on Mac, Ctrl K on Others)
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgentData?.platform || navigator.userAgent);
    if (searchShortcutHint) {
        searchShortcutHint.textContent = isMac ? '⌘ K' : 'Ctrl K';
    }

    window.addEventListener('keydown', (e) => {
        // Toggle palette
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { 
            e.preventDefault(); 
            palette.classList.contains('hidden') ? openModal() : closeModal(); 
        }

        if (e.key === 'Escape') closeModal();

        // Arrow navigation
        if (palette && !palette.classList.contains('hidden') && filteredResults.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % filteredResults.length;
                updateSelectionUI();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + filteredResults.length) % filteredResults.length;
                updateSelectionUI();
            } else if (e.key === 'Enter') {
                const items = resultsList.querySelectorAll('.search-item');
                items[activeIndex]?.click();
            }
        }
    });

    // Modal Interaction
    if (openSearchBtn) openSearchBtn.onclick = openModal;
    if (backdrop) backdrop.onclick = closeModal;
    
    // Live Filtering
    if (searchInput) {
        searchInput.oninput = () => {
            activeIndex = 0;
            renderResults();
        };
    }

    // Category Chips Logic
    filterChips.forEach(chip => {
        chip.onclick = () => {
            filterChips.forEach(c => {
                c.classList.remove('bg-primary', 'text-white');
                c.classList.add('bg-white', 'text-gray-600');
            });

            chip.classList.add('bg-primary', 'text-white');
            chip.classList.remove('bg-white', 'text-gray-600');

            currentFilter = chip.dataset.category;
            activeIndex = 0;
            renderResults();
        };
    });

    // Initialize the systems
    initSearch();
});