// ==========================================================================
// CONTROLADOR DE LA PÁGINA DE INICIO (index.html)
// ==========================================================================

// --- 1. SECCIONES DEL MATERIAL EN MODAL ---
const modalContainer = document.getElementById('modal-container');
const modalCloseButton = document.getElementById('modal-close-button');
let modalTrigger = null;

function openModal(modalId) {
    const target = document.getElementById(`modal-${modalId}`);
    if (!target || !modalContainer) return;

    document.querySelectorAll('#modal-container .modal-section').forEach(section => {
        section.classList.remove('active');
    });

    target.classList.add('active');
    modalContainer.classList.add('show');
    document.body.style.overflow = 'hidden';

    modalTrigger = document.activeElement;

    const scrollArea = target.querySelector('.section-modal-scroll');
    if (scrollArea) scrollArea.scrollTop = 0;

    modalCloseButton?.focus();
}

function closeModal() {
    if (!modalContainer) return;

    modalContainer.classList.remove('show');
    document.body.style.overflow = '';

    if (modalTrigger instanceof HTMLElement) {
        modalTrigger.focus();
    }

    modalTrigger = null;
}

document.querySelectorAll('[data-modal]').forEach(button => {
    button.addEventListener('click', event => {
        event.preventDefault();
        openModal(button.dataset.modal);
    });
});

modalCloseButton?.addEventListener('click', closeModal);

modalContainer?.addEventListener('click', event => {
    if (event.target === modalContainer) {
        closeModal();
    }
});


// --- 2. PESTAÑAS DEL GLOSARIO ---
function switchUnit(unitId, btn) {
    document.querySelectorAll('.unit-content').forEach(el => {
        el.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });

    const target = document.getElementById(unitId);

    if (target) {
        target.classList.add('active');
        btn?.classList.add('active');
    }
}


// --- 3. PESTAÑAS DE ACTIVIDADES ---
document.querySelectorAll('[data-activity-panel]').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-activity-panel]').forEach(tab => {
            const selected = tab === button;

            tab.classList.toggle('active', selected);
            tab.setAttribute('aria-pressed', String(selected));

            const target = document.getElementById(tab.dataset.activityPanel);

            if (target) {
                target.hidden = !selected;
            }
        });
    });
});


// --- 4. AUTORES / COLABORADORES ---
function toggleCreadoresView(viewId) {
    const autores = document.getElementById('seccion-autores');
    const colaboradores = document.getElementById('seccion-colaboradores');
    const tabAutores = document.getElementById('tab-autores');
    const tabColaboradores = document.getElementById('tab-colaboradores');

    const mostrarColaboradores = viewId === 'colaboradores';

    if (autores) {
        autores.style.display = mostrarColaboradores ? 'none' : 'block';
    }

    if (colaboradores) {
        colaboradores.style.display = mostrarColaboradores ? 'block' : 'none';
    }

    tabAutores?.classList.toggle('active', !mostrarColaboradores);
    tabColaboradores?.classList.toggle('active', mostrarColaboradores);
}


// --- 5. BARRA DE NAVEGACIÓN ---
const siteNav = document.querySelector('.site-nav');
const navToggle = document.querySelector('.nav-toggle');
const mainNavigation = document.getElementById('main-navigation');

if (navToggle && mainNavigation) {
    navToggle.addEventListener('click', () => {
        const open = mainNavigation.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
    });

    mainNavigation.addEventListener('click', () => {
        mainNavigation.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
    });
}


// --- 6. REPRODUCTOR DE VIDEO ---
const videoOverlay = document.getElementById('video-player-overlay');
const videoFrame = document.getElementById('main-video-frame');

function playVideo(videoId) {
    if (!videoOverlay || !videoFrame) return;

    videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    videoOverlay.classList.add('show');
}

function closeVideoPlayer() {
    if (!videoOverlay || !videoFrame) return;

    videoOverlay.classList.remove('show');
    videoFrame.src = '';
}

videoOverlay?.addEventListener('click', event => {
    if (event.target === videoOverlay) {
        closeVideoPlayer();
    }
});


// --- 7. ESTRUCTURA INTERNA DEL MODAL ---
// Encabezado fijo + contenido desplazable.
document.querySelectorAll('#modal-container .modal-section').forEach(section => {
    const heading = section.querySelector(':scope > h3');

    const filters = section.querySelector(
        ':scope > .modal-subsection-nav, ' +
        ':scope > .activity-subsections, ' +
        ':scope > .modal-tabs'
    );

    const header = document.createElement('div');
    header.className = 'section-modal-header';

    if (heading) {
        header.append(heading);
    }

    const content = document.createElement('div');
    content.className = 'section-modal-scroll';

    [...section.childNodes].forEach(node => {
        if (node !== filters) {
            content.append(node);
        }
    });

    section.append(header);

    if (filters) {
        section.append(filters);
    }

    section.append(content);
});


// --- 8. TECLA ESC ---
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;

    if (videoOverlay?.classList.contains('show')) {
        closeVideoPlayer();
        return;
    }

    if (modalContainer?.classList.contains('show')) {
        closeModal();
        return;
    }

    if (mainNavigation) {
        mainNavigation.classList.remove('is-open');
        navToggle?.setAttribute('aria-expanded', 'false');
    }
});