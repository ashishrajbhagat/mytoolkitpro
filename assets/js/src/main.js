document.addEventListener('DOMContentLoaded', () => {

    // Mobile Menu
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    btn.addEventListener('click', () => {
        menu.classList.toggle('hidden');
    });

    // Carousel
    const carousel = document.getElementById('articles-carousel');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const dotsContainer = document.getElementById('carousel-dots');
    
    if (!carousel || !prevBtn || !nextBtn) return;

    const items = carousel.querySelectorAll('a');
        
    items.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = `w-2 h-2 rounded-full transition-all duration-300 ${i === 0 ? 'bg-primary w-6' : 'bg-gray-300'}`;
        dot.ariaLabel = `Go to slide ${i + 1}`;
        dot.onclick = () => items[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        dotsContainer.appendChild(dot);
    });
    
    const dots = dotsContainer.children;

    const updateState = () => {
        const scrollLeft = carousel.scrollLeft;
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        
        prevBtn.classList.toggle('opacity-0', scrollLeft <= 10);
        prevBtn.classList.toggle('pointer-events-none', scrollLeft <= 10);
        
        nextBtn.classList.toggle('opacity-0', scrollLeft >= maxScroll - 10);
        nextBtn.classList.toggle('pointer-events-none', scrollLeft >= maxScroll - 10);

        const center = scrollLeft + (carousel.clientWidth / 2);
        let activeIndex = 0;
        let minDist = Infinity;
        
        items.forEach((item, i) => {
            const itemCenter = item.offsetLeft + (item.clientWidth / 2);
            const dist = Math.abs(center - itemCenter);
            if(dist < minDist) { minDist = dist; activeIndex = i; }
        });

        Array.from(dots).forEach((dot, i) => {
            dot.className = `w-2 h-2 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-primary w-6' : 'bg-gray-300'}`;
        });
    };

    carousel.addEventListener('scroll', updateState);
    window.addEventListener('resize', updateState);
    setTimeout(updateState, 100); // Initial check

    prevBtn.onclick = () => carousel.scrollBy({ left: -carousel.clientWidth * 0.8, behavior: 'smooth' });
    nextBtn.onclick = () => carousel.scrollBy({ left: carousel.clientWidth * 0.8, behavior: 'smooth' });

    // FAQ
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.faq-toggle');
        if (!btn) return;

        e.preventDefault();

        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        const allBtns = document.querySelectorAll('.faq-toggle');

        allBtns.forEach(other => {
            if (other !== btn) {
                other.setAttribute('aria-expanded', 'false');
                const targetId = other.getAttribute('aria-controls');
                document.getElementById(targetId)?.classList.add('hidden');
                other.querySelector('svg')?.classList.remove('rotate-180');
            }
        });

        const newState = !isExpanded;
        btn.setAttribute('aria-expanded', newState);
        const currentTargetId = btn.getAttribute('aria-controls');
        const content = document.getElementById(currentTargetId);
        if (content) {
            content.classList.toggle('hidden', !newState);
        }
        
        btn.querySelector('svg')?.classList.toggle('rotate-180', newState);
    });

    // Year
    document.getElementById('year').textContent = new Date().getFullYear();

});