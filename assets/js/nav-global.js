// ==========================================================================
// COMPORTAMIENTO GLOBAL DE LA BARRA DE NAVEGACIÓN (.site-nav)
// Contracción al hacer scroll y reaparición al mover el cursor al borde superior
// ==========================================================================
(function() {
    function initNav() {
        const siteNav = document.querySelector('.site-nav');
        if (!siteNav) return;

        const navToggle = siteNav.querySelector('.nav-toggle');
        const mainNavigation = siteNav.querySelector('#main-navigation');
        let pointerAtTop = false;

        function updateNavigation() {
            const mobile = matchMedia('(max-width: 768px)').matches;
            const atTop = window.scrollY <= 15;
            const isFocused = siteNav.contains(document.activeElement);
            const isOpen = mainNavigation && mainNavigation.classList.contains('is-open');

            const visible = mobile || atTop || pointerAtTop || isFocused || isOpen;
            siteNav.classList.toggle('is-hidden', !visible);
            siteNav.classList.toggle('is-at-top', atTop);
        }

        document.addEventListener('mousemove', e => {
            const rect = siteNav.getBoundingClientRect();
            // Se activa al acercarse a 50px del borde superior o al pasar sobre la barra
            pointerAtTop = (e.clientY <= 50) || (e.clientY <= rect.bottom + 15 && e.clientX >= rect.left - 20 && e.clientX <= rect.right + 20);
            updateNavigation();
        }, { passive: true });

        document.documentElement.addEventListener('mouseleave', () => {
            pointerAtTop = false;
            updateNavigation();
        });

        window.addEventListener('scroll', () => {
            pointerAtTop = false;
            updateNavigation();
        }, { passive: true });

        window.addEventListener('resize', updateNavigation);
        siteNav.addEventListener('focusin', updateNavigation);
        siteNav.addEventListener('focusout', () => requestAnimationFrame(updateNavigation));

        if (navToggle && mainNavigation) {
            navToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const open = mainNavigation.classList.toggle('is-open');
                navToggle.setAttribute('aria-expanded', String(open));
                updateNavigation();
            });
            mainNavigation.addEventListener('click', () => {
                mainNavigation.classList.remove('is-open');
                navToggle.setAttribute('aria-expanded', 'false');
                updateNavigation();
            });
        }

        updateNavigation();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }
})();
