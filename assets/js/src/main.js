document.addEventListener('DOMContentLoaded', () => {

    // Mobile menu elements
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // Footer year
    const year = document.getElementById('year');

    // Search / Command palette elements
    const openBtn = document.getElementById('open-search-btn');
    const shortcut = document.getElementById('search-shortcut');
    const palette = document.getElementById('command-palette');
    const backdrop = document.getElementById('modal-backdrop');
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    const resultsList = document.getElementById('search-results-list');
    const resultCount = document.getElementById('result-count');
    
    // Toggle mobile menu
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Set current year dynamically
    year.textContent = new Date().getFullYear();

    // Search state
    let allTools = [];
    let filteredResults = [];
    let activeIndex = 0;
    let currentFilter = 'all';

    // Load tools data from JSON
    async function initSearch() {
        try {
            const response = await fetch('/assets/data/tools.json');
            allTools = await response.json();
        } catch (error) {
            console.error("Could not load tools database:", error);
        }
    }

    // Open search modal
    const openModal = () => {
        palette.classList.remove('hidden');
        searchInput.focus();
        renderResults();
    };

    // Close search modal and reset state
    const closeModal = () => {
        palette.classList.add('hidden');
        searchInput.value = '';
        activeIndex = 0;
    };

    // Render filtered + searched results
    function renderResults() {
        const query = searchInput.value.toLowerCase().trim();
        resultsList.innerHTML = '';

        filteredResults = allTools.filter(t => {
            const matchesFilter = currentFilter === 'all' || t.category === currentFilter;
            const matchesSearch = t.name.toLowerCase().includes(query) || 
                                  t.keywords.some(k => k.includes(query));
            return matchesFilter && matchesSearch;
        });

        // Empty state
        if (filteredResults.length === 0) {
            resultsList.innerHTML = `<div class="p-8 text-center text-gray-500 text-base">No results found...</div>`;
        } else {
            // Render each result item
            filteredResults.forEach((tool, idx) => {
                const item = document.createElement('div');
                item.className = `search-item flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-all mb-1 group ${idx === activeIndex ? 'active-selection' : ''} border-l-4 border-transparent`;
                
                item.innerHTML = `
                    <div class="text-2xl">${tool.icon}</div>
                    <div>
                        <div class="text-base font-bold text-gray-900 group-hover:text-primary">${tool.name}</div>
                        <div class="text-sm font-medium text-gray-500">${tool.desc}</div>
                    </div>
                `;

                // Hover = change active selection
                item.onmouseenter = () => {
                    activeIndex = idx;
                    updateSelection(resultsList, activeIndex);
                };

                // Click = navigate to tool
                item.onclick = () => {
                    window.location.href = '/' + tool.url;
                };

                resultsList.appendChild(item);
            });

            updateSelection(resultsList, activeIndex);
        }

        // Update result count
        resultCount.innerText = `${filteredResults.length} tools`;
    }

    // Highlight active item (keyboard / hover)
    function updateSelection(resultsList, activeIndex) {
        const items = resultsList.querySelectorAll('.search-item');

        items.forEach((el, i) => {
            if (i === activeIndex) {
                el.classList.add('bg-primary/10', 'border-l-4', 'border-primary');
                el.classList.remove('bg-transparent', 'border-transparent', 'hover:bg-gray-50');

                // Ensure selected item is visible
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                el.classList.remove('bg-primary/10', 'border-l-4', 'border-primary');
                el.classList.add('bg-transparent', 'border-transparent', 'hover:bg-gray-50');
            }
        });
    }

    // Detect if the user is on a Mac
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgentData?.platform || navigator.userAgent);
    shortcut.textContent = isMac ? '⌘ K' : 'Ctrl K';

    // Keyboard shortcuts & navigation
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { 
            e.preventDefault(); 
            openModal(); 
        }

        if (e.key === 'Escape') closeModal();

        // Navigate results using arrow keys
        if (!palette.classList.contains('hidden') && filteredResults.length > 0) {
            const items = resultsList.querySelectorAll('.search-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                updateSelection(resultsList, activeIndex);

            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                updateSelection(resultsList, activeIndex);

            } else if (e.key === 'Enter') {
                items[activeIndex]?.click();
            }
        }
    });

    // Open / close handlers
    if (openBtn) openBtn.onclick = openModal;
    if (backdrop) backdrop.onclick = closeModal;
    
    // Live search input
    searchInput.oninput = () => {
        activeIndex = 0;
        renderResults();
    };

    // Category filter chips
    filterChips.forEach(chip => {
        chip.onclick = () => {

            // Reset all chips
            filterChips.forEach(c => {
                c.classList.remove('bg-primary', 'text-white', 'hover:bg-primary/90');
                c.classList.add('bg-white', 'text-gray-600', 'border-gray-200', 'hover:bg-gray-100');
            });

            // Activate selected chip
            chip.classList.add('bg-primary', 'text-white', 'hover:bg-primary/90');
            chip.classList.remove('bg-white', 'text-gray-600', 'border-gray-200', 'hover:bg-gray-100');

            currentFilter = chip.dataset.category;
            renderResults();
        };
    });

    // Initialize data
    initSearch();

});