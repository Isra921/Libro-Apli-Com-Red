// ==========================================================================
// CONTROLADOR DE LA PÁGINA DE INICIO (index.html)
// Master-Detail Dynamic Viewer, Navegación y Accesibilidad
// ==========================================================================

// --- 1. METADATOS Y CONTROLADOR DEL VISOR DINÁMICO ---
const sectionMetadata = {
    'bienvenida': { title: 'Bienvenida', tag: 'Presentación institucional', icon: 'fa-home' },
    'introduccion': { title: 'Introducción y Objetivos', tag: 'Contexto de la materia', icon: 'fa-lightbulb' },
    'programa': { title: 'Programa académico', tag: 'Estructura curricular', icon: 'fa-file-alt' },
    'metodologia': { title: 'Metodología', tag: 'Estrategias de aprendizaje', icon: 'fa-sitemap' },
    'examen': { title: 'Examen diagnóstico', tag: 'Evaluación inicial', icon: 'fa-file-signature' },
    'actividades': { title: 'Actividades de aprendizaje', tag: 'Práctica formativa', icon: 'fa-gamepad' },
    'glosario': { title: 'Glosario de términos', tag: 'Conceptos clave', icon: 'fa-book' },
    'creadores': { title: 'Autores y colaboradores', tag: 'Equipo de desarrollo', icon: 'fa-users' },
    'colaboradores': { title: 'Autores y colaboradores', tag: 'Equipo de desarrollo', icon: 'fa-users' },
    'licencia': { title: 'Términos y licenciamiento', tag: 'Licencia Creative Commons', icon: 'fa-creative-commons' }
};

function activateSection(sectionId, scrollOnMobile = true) {
    if (sectionId === 'Introducción' || sectionId === 'encuadre') sectionId = 'introduccion';

    // 1. Ocultar todos los paneles
    document.querySelectorAll('.viewer-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    // 2. Deseleccionar todos los botones
    document.querySelectorAll('.quick-link').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });

    // 3. Activar el panel seleccionado
    const targetPane = document.getElementById(`pane-${sectionId}`);
    if (targetPane) {
        targetPane.classList.add('active');
        const scrollArea = document.querySelector('.dynamic-content-area');
        if (scrollArea) scrollArea.scrollTop = 0;
    }

    // 4. Activar el botón correspondiente
    const targetBtn = document.querySelector(`.quick-link[data-section="${sectionId}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
        targetBtn.setAttribute('aria-selected', 'true');
    }

    // 5. Actualizar encabezado del visor
    const meta = sectionMetadata[sectionId] || { title: 'Contenido', tag: 'Información', icon: 'fa-info-circle' };
    const headingEl = document.getElementById('viewerHeading');
    const tagEl = document.getElementById('viewerTag');
    const btnReturn = document.getElementById('btnReturnBienvenida');

    if (headingEl) headingEl.textContent = meta.title;
    if (tagEl) tagEl.innerHTML = `<i class="fas ${meta.icon}"></i> ${meta.tag}`;
    if (btnReturn) {
        btnReturn.style.display = (sectionId === 'bienvenida') ? 'none' : 'inline-flex';
    }

    // 6. En pantallas móviles, scroll hacia el visor
    if (scrollOnMobile && window.innerWidth <= 1000) {
        const viewer = document.getElementById('dynamicViewer');
        if (viewer) {
            viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// Escuchadores de eventos para los botones de sección
document.querySelectorAll('[data-section]').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = button.getAttribute('data-section');
        activateSection(sectionId);
    });
});

document.querySelectorAll('[data-modal]').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = button.getAttribute('data-modal');
        activateSection(sectionId);
    });
});

// Pestañas del glosario dentro del visor
function switchUnit(unitId, btn) {
    document.querySelectorAll('.unit-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const targetUnit = document.getElementById(unitId);
    if (targetUnit) {
        targetUnit.classList.add('active');
        if (btn) btn.classList.add('active');
    }
}

function openGlosarioModal() {
    activateSection('glosario');
}
function closeGlosarioModal() {
    activateSection('bienvenida');
}
function openModal(modalId) {
    activateSection(modalId);
}
function closeModal() {
    activateSection('bienvenida');
}

// Pestañas de actividades
document.querySelectorAll('[data-activity-panel]').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-activity-panel]').forEach(tab => {
            const selected = tab === button;
            tab.classList.toggle('active', selected);
            tab.setAttribute('aria-pressed', String(selected));
            const targetEl = document.getElementById(tab.dataset.activityPanel);
            if (targetEl) targetEl.hidden = !selected;
        });
    });
});

// Pestañas de autores / colaboradores
function toggleCreadoresView(viewId) {
    const autoresSection = document.getElementById('seccion-autores');
    const colaboradoresSection = document.getElementById('seccion-colaboradores');
    const tabAutores = document.getElementById('tab-autores');
    const tabColab = document.getElementById('tab-colaboradores');
    if (viewId === 'colaboradores') {
        if (autoresSection) autoresSection.style.display = 'none';
        if (colaboradoresSection) colaboradoresSection.style.display = 'block';
        if (tabAutores) tabAutores.classList.remove('active');
        if (tabColab) tabColab.classList.add('active');
    } else {
        if (autoresSection) autoresSection.style.display = 'block';
        if (colaboradoresSection) colaboradoresSection.style.display = 'none';
        if (tabAutores) tabAutores.classList.add('active');
        if (tabColab) tabColab.classList.remove('active');
    }
}

// --- 2. BARRA DE NAVEGACIÓN GLOBAL ---
// Gestionada de forma centralizada y unificada por assets/js/nav-global.js


// --- 3. REPRODUCTOR DE VIDEO ---
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

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (videoOverlay && videoOverlay.classList.contains('show')) closeVideoPlayer();
        if (mainNavigation) {
            mainNavigation.classList.remove('is-open');
            if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
        }
    }
});
