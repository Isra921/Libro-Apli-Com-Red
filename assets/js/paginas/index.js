       function switchActUnit(unitId, btn) {
    document.querySelectorAll('.act-unit-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn-act').forEach(el => {
        el.style.background = 'transparent';
        el.style.color = 'var(--text-muted-light)';
    });
    const target = document.getElementById(unitId);
    if (target) {
        target.style.display = 'block';
        btn.style.background = 'var(--secondary)';
        btn.style.color = 'white';
    }
}
        // --- FUNCIONES DEL GLOSARIO FLOTANTE ---
        function openGlosarioModal() {
            const modal = document.getElementById('glosarioModal');
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
        function closeGlosarioModal() {
            const modal = document.getElementById('glosarioModal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }
        function switchUnit(unitId, btn) {
            document.querySelectorAll('.unit-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        // Navigation initialization complete.
            const targetUnit = document.getElementById(unitId);
            if (targetUnit) {
                targetUnit.classList.add('active');
                btn.classList.add('active');
            }
        }
        // Navigation initialization complete.
        const glosarioModalEl = document.getElementById('glosarioModal');
        if (glosarioModalEl) {
            glosarioModalEl.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeGlosarioModal();
                }
            });
        }

        // --- MANEJO DE MODALES GENERALES DEL MEN ---
        const modalContainer = document.getElementById('modal-container');
        const modalCloseButton = document.getElementById('modal-close-button');
        const cardsWithModal = document.querySelectorAll('[data-modal]');

        function openModal(modalId) {
            document.querySelectorAll('.modal-section').forEach(section => section.classList.remove('active'));
            const activeSection = document.getElementById(`modal-${modalId}`);
            if (activeSection) {
                activeSection.classList.add('active');
                if (modalContainer) modalContainer.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeModal() {
            if (modalContainer) {
                modalContainer.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        }

        cardsWithModal.forEach(card => {
            card.addEventListener('click', () => {
                const modalId = card.getAttribute('data-modal');
                openModal(modalId);
            });
        });

        if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
        if (modalContainer) {
            modalContainer.addEventListener('click', e => {
                if (e.target === modalContainer) closeModal();
            });
        }

        // --- EFECTO 3D HOVER (DESKTOP) ---
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (!isTouchDevice) {
            document.querySelectorAll('.card').forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateY = (x - centerX) / 25;
                    const rotateX = (centerY - y) / 25;
                    const maxRotation = 8;
                    const clampedRotateX = Math.max(Math.min(rotateX, maxRotation), -maxRotation);
                    const clampedRotateY = Math.max(Math.min(rotateY, maxRotation), -maxRotation);
                    
                    card.style.transform = `perspective(1200px) rotateX(${clampedRotateX}deg) rotateY(${clampedRotateY}deg) translateY(-8px) scale(1.02)`;
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) translateY(0) scale(1)';
                });
            });
        }

        // --- REPRODUCTOR DE VIDEO ---
        const videoOverlay = document.getElementById('video-player-overlay');
        const videoFrame = document.getElementById('main-video-frame');

        function playVideo(videoId) {
            if (videoFrame && videoOverlay) {
                videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                videoOverlay.classList.add('show');
            }
        }

        function closeVideoPlayer() {
            if (videoOverlay && videoFrame) {
                videoOverlay.classList.remove('show');
                videoFrame.src = '';
            }
        }

        if (videoOverlay) {
            videoOverlay.addEventListener('click', (e) => {
                if (e.target === videoOverlay) closeVideoPlayer();
            });
        }


// La barra aparece arriba o al acercarse al borde superior, nunca por dirección del scroll.
const siteNav = document.querySelector('.site-nav');
const navToggle = document.querySelector('.nav-toggle');
const mainNavigation = document.getElementById('main-navigation');
let pointerAtTop = false;
function updateNavigation() {
    const mobile = matchMedia('(max-width: 760px)').matches;
    const visible = mobile || window.scrollY === 0 || pointerAtTop || siteNav.contains(document.activeElement);
    siteNav.classList.toggle('is-hidden', !visible);
}
document.addEventListener('mousemove', e => {
    pointerAtTop = e.clientY <= 40 || (e.clientY <= siteNav.getBoundingClientRect().bottom && siteNav.contains(e.target));
    updateNavigation();
});
document.documentElement.addEventListener('mouseleave', () => { pointerAtTop = false; updateNavigation(); });
window.addEventListener('scroll', () => { pointerAtTop = false; updateNavigation(); }, {passive:true});
window.addEventListener('resize', updateNavigation);
siteNav.addEventListener('focusin', updateNavigation);
siteNav.addEventListener('focusout', () => requestAnimationFrame(updateNavigation));
navToggle.addEventListener('click', () => {
    const open = mainNavigation.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
});
mainNavigation.addEventListener('click', () => {
    mainNavigation.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
});
updateNavigation();

document.querySelectorAll('[data-activity-panel]').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-activity-panel]').forEach(tab => {
            const selected = tab === button;
            tab.classList.toggle('active', selected);
            tab.setAttribute('aria-pressed', String(selected));
            document.getElementById(tab.dataset.activityPanel).hidden = !selected;
        });
    });
});

// Mantener el foco dentro del diálogo y devolverlo al acceso que lo abrió.
let dialogTrigger = null;
let activeDialog = null;
function enterDialog(overlay, label) {
    if (!activeDialog) dialogTrigger = document.activeElement;
    activeDialog = overlay;
    const panel = overlay.querySelector('.modal-content, .modal-container');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', label);
    document.querySelector('main').inert = true;
    siteNav.inert = true;
    panel.scrollTop = 0;
    const body = panel.querySelector('.modal-body');
    if (body) body.scrollTop = 0;
    panel.querySelectorAll('.section-modal-scroll').forEach(el => { el.scrollTop = 0; });
    const close = panel.querySelector('button');
    close.setAttribute('aria-label', 'Cerrar ventana');
    close.focus();
}
function leaveDialog() {
    activeDialog = null;
    document.querySelector('main').inert = false;
    siteNav.inert = false;
    dialogTrigger?.focus();
}
const originalOpenModal = openModal;
openModal = function(id) {
    originalOpenModal(id);
    if (document.getElementById('modal-' + id)) enterDialog(modalContainer, document.querySelector('#modal-' + id + ' h3')?.textContent || 'Material');
};
const originalCloseModal = closeModal;
closeModal = function() { originalCloseModal(); leaveDialog(); };
// El listener original conservaba la referencia anterior.
modalCloseButton.removeEventListener('click', originalCloseModal);
modalCloseButton.addEventListener('click', closeModal);
const originalOpenGlossary = openGlosarioModal;
openGlosarioModal = function() { originalOpenGlossary(); enterDialog(glosarioModalEl, 'Glosario de términos'); };
const originalCloseGlossary = closeGlosarioModal;
closeGlosarioModal = function() { originalCloseGlossary(); leaveDialog(); };
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (activeDialog === glosarioModalEl) closeGlosarioModal();
        else if (activeDialog) closeModal();
        else { mainNavigation.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); }
    }
    if (e.key !== 'Tab' || !activeDialog) return;
    const nodes = [...activeDialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter(el => el.getClientRects().length && !el.disabled);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// Encabezado y filtros fuera del área desplazable, como en el glosario.
document.querySelectorAll('#modal-container .modal-section').forEach(section => {
    const heading = section.querySelector('h3');
    const filters = section.querySelector('.modal-subsection-nav, .activity-subsections');
    const header = document.createElement('div');
    header.className = 'section-modal-header';
    if (heading) header.append(heading);
    const content = document.createElement('div');
    content.className = 'section-modal-scroll';
    [...section.childNodes].forEach(node => { if (node !== filters) content.append(node); });
    section.append(header);
    if (filters) section.append(filters);
    section.append(content);
});
