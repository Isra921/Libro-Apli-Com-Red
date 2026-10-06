// ==========================================================================
// REFERENCIAS Y RECURSOS ACADÉMICOS · Interactividad
// Filtrado por categoría, búsqueda en vivo y copiado rápido de citas APA
// ==========================================================================
(function() {
    function initReferencias() {
        const filterButtons = document.querySelectorAll('.r-filter-btn');
        const searchInput = document.getElementById('searchRef');
        const cards = document.querySelectorAll('.r-card');
        const emptyState = document.getElementById('rEmpty');

        let activeCategory = 'todos';
        let searchQuery = '';

        function updateFilterCounts() {
            const counts = { todos: cards.length };
            cards.forEach(card => {
                const cat = card.dataset.category;
                counts[cat] = (counts[cat] || 0) + 1;
            });

            filterButtons.forEach(btn => {
                const cat = btn.dataset.filter;
                const countBadge = btn.querySelector('.r-count');
                if (countBadge && counts[cat] !== undefined) {
                    countBadge.textContent = counts[cat];
                }
            });
        }

        function filterCards() {
            let visibleCount = 0;

            cards.forEach(card => {
                const category = card.dataset.category;
                const text = card.textContent.toLowerCase();

                const matchesCategory = (activeCategory === 'todos' || category === activeCategory);
                const matchesSearch = !searchQuery || text.includes(searchQuery);

                if (matchesCategory && matchesSearch) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (emptyState) {
                emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
            }
        }

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');
                activeCategory = btn.dataset.filter;
                filterCards();
            });
        });

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim().toLowerCase();
                filterCards();
            });
        }

        // Manejador de copiado de cita APA
        document.querySelectorAll('.r-btn-copy').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('.r-card');
                const citationText = card.querySelector('.r-card__citation')?.textContent?.trim() || '';

                try {
                    await navigator.clipboard.writeText(citationText);
                    const originalText = btn.innerHTML;
                    btn.classList.add('is-copied');
                    btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
                    setTimeout(() => {
                        btn.classList.remove('is-copied');
                        btn.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    // Fallback
                    const textarea = document.createElement('textarea');
                    textarea.value = citationText;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    btn.classList.add('is-copied');
                    btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
                    setTimeout(() => {
                        btn.classList.remove('is-copied');
                        btn.innerHTML = '<i class="fas fa-copy"></i> Cita APA';
                    }, 2000);
                }
            });
        });

        updateFilterCounts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReferencias);
    } else {
        initReferencias();
    }
})();
