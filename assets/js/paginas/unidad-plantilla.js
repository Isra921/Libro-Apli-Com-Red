// ==========================================================================
// PLANTILLA DE UNIDAD (unidades/unidad-XX/index.html)
// Lee <body data-unidad="unidad-XX"> y dibuja toda la página a partir de
// assets/data/unidades/unidad-XX.json. Ningún texto de contenido vive aquí.
// Depende de: data-manager.js, unidades-ui.js
//
// Jerarquía de la vista:
//   1. Encabezado compacto + botón "Comenzar tema X.X"
//   2. Introducción completa (se desvanece al hacer scroll)
//   3. Temas en lista o tarjetas (cada tema incluye su actividad)
//   4. Actividad final como cierre
//   Barra lateral: objetivo, competencias, actividades y material de apoyo (incluye el video)
//
// Regla: si un tema está "Próximamente" (url vacía), su actividad también se bloquea.
// ==========================================================================

(function () {
    const UI = UnidadesUI;
    const PASO_VECINO = 1;
    const CLAVE_VISTA_TEMAS = 'vistaTemasUnidad';
    const VISTA_TEMAS_POR_DEFECTO = UI.VISTAS.LISTA;

    // Desvanecimiento de la introducción al hacer scroll
    const OPACIDAD_MAXIMA = 1;
    const PROGRESO_MINIMO = 0;
    const PROGRESO_MAXIMO = 1;
    const DESPLAZAMIENTO_INTRO_PX = 24;
    const REFERENCIA_POR_DEFECTO_PX = 0;
    const ICONO_TEMA_POR_DEFECTO = 'fa-book-open';

    // Mensajes de la interfaz para elementos que todavía no están disponibles
    const MENSAJES = {
        temaNoDisponible: numero => `El tema ${numero} aún no está disponible`,
        actividadEnConstruccion: 'Actividad en construcción',
        materialEnConstruccion: 'Material en construcción'
    };

    // ---------- Utilidades de datos ----------

    /** Ícono del tema en la vista de tarjetas: campo "icono" opcional del JSON o uno por defecto. */
    function iconoTema(tema) {
        return tema.icono || ICONO_TEMA_POR_DEFECTO;
    }

    // ---------- Secciones ----------

    function hero(unidad, numeral, primerTema) {
        const temas = UI.lista(unidad.temas);
        const actividades = UI.actividades(unidad);

        const duracion = unidad.duracion_horas
            ? `<li class="u-chip u-chip--soft"><i class="far fa-clock" aria-hidden="true"></i> Duración estimada ${UI.esc(unidad.duracion_horas)} h</li>`
            : '';

        const botonComenzar = primerTema
            ? `<div class="u-hero__actions">
                    <a class="u-btn u-btn--primary" href="${UI.esc(DataManager.ruta(primerTema.url))}">
                        Comenzar tema ${UI.esc(primerTema.numero)} <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </a>
               </div>`
            : '';

        return `
            <header class="u-hero">
                <div class="u-hero__numeral" aria-hidden="true">
                    <span class="u-numeral__label">Unidad</span>
                    <span class="u-numeral__value">${numeral}</span>
                </div>
                <div class="u-hero__text">
                    <h1 class="u-hero__title"><span class="u-sr-only">Unidad ${numeral}: </span>${UI.esc(unidad.titulo)}</h1>
                    ${unidad.lema ? `<p class="u-hero__lead">${UI.esc(unidad.lema)}</p>` : ''}
                    <ul class="u-hero__chips" aria-label="Resumen de la unidad">
                        <li class="u-chip u-chip--soft"><i class="fas fa-book-open" aria-hidden="true"></i> ${UI.plural(temas.length, 'tema', 'temas')}</li>
                        <li class="u-chip u-chip--soft"><i class="fas fa-list-check" aria-hidden="true"></i> ${UI.plural(actividades.length, 'actividad', 'actividades')}</li>
                        ${duracion}
                    </ul>
                </div>
                ${botonComenzar}
            </header>`;
    }

    /** Introducción completa. Se desvanece al hacer scroll (ver iniciarDesvanecimientoIntro). */
    function introduccion(unidad) {
        const parrafos = UI.lista(unidad.introduccion);
        if (!parrafos.length) return '';
        return `
            <section class="u-intro" id="introduccion" aria-label="Introducción">
                <p class="u-eyebrow">Introducción</p>
                ${parrafos.map(p => `<p class="u-intro__text">${UI.esc(p)}</p>`).join('')}
            </section>`;
    }

    function tarjetaTema(tema) {
        const disponible = Boolean(tema.url);
        const actividad = tema.actividad;

        const chipPendiente = disponible ? '' : '<span class="u-pending-label u-topic-card__pending">Próximamente</span>';

        const botonTema = disponible
            ? `<a class="u-topic-card__link" href="${UI.esc(DataManager.ruta(tema.url))}">Ver tema</a>`
            : `<span class="u-topic-card__link is-pending" aria-disabled="true">Ver tema</span>`;

        // La actividad solo se habilita si el tema y la actividad tienen página.
        const contenidoActividad = actividad
            ? `<i class="fas fa-pen-to-square" aria-hidden="true"></i> Actividad ${UI.esc(tema.numero)}`
            : '';
        const botonActividad = !actividad ? '' : (disponible && actividad.url
            ? `<a class="u-topic-card__activity" href="${UI.esc(DataManager.ruta(actividad.url))}">${contenidoActividad}</a>`
            : `<span class="u-topic-card__activity is-pending" aria-disabled="true">${contenidoActividad}</span>`);

        return `
            <li class="u-topic-card${disponible ? '' : ' is-pending'}">
                <div class="u-topic-card__head">
                    <span class="u-topic-card__num">${UI.esc(tema.numero)}</span>
                    <span class="u-topic-card__icon"><i class="fas ${UI.esc(iconoTema(tema))}" aria-hidden="true"></i></span>
                </div>
                <div class="u-topic-card__body">
                    ${chipPendiente}
                    <h3 class="u-topic-card__title">${disponible
                        ? `<a class="u-topic-card__title-link" href="${UI.esc(DataManager.ruta(tema.url))}">${UI.esc(tema.nombre)}</a>`
                        : UI.esc(tema.nombre)}</h3>
                    ${tema.sintesis ? `<p class="u-topic-card__summary">${UI.esc(tema.sintesis)}</p>` : ''}
                </div>
                <div class="u-topic-card__foot">
                    ${botonTema}
                    ${botonActividad}
                </div>
            </li>`;
    }

    function temas(unidad) {
        const lista = UI.lista(unidad.temas);
        if (!lista.length) return '';
        return `
            <section class="u-topics-section" id="temas" aria-labelledby="h-temas">
                <div class="u-topics-head">
                    <div>
                        <h2 class="u-section-title" id="h-temas">Temas de la unidad</h2>
                        ${unidad.recorrido ? `<p class="u-muted">${UI.esc(unidad.recorrido)}</p>` : ''}
                    </div>
                    <div class="u-view-toggle" role="group" aria-label="Ver temas como">
                        <button type="button" data-vista="${UI.VISTAS.TARJETAS}" aria-pressed="false"><i class="fas fa-grip" aria-hidden="true"></i> Tarjetas</button>
                        <button type="button" data-vista="${UI.VISTAS.LISTA}" aria-pressed="true"><i class="fas fa-list" aria-hidden="true"></i> Lista</button>
                    </div>
                </div>
                <ol class="u-topic-grid" id="listaTemas">
                    ${lista.map(tarjetaTema).join('')}
                </ol>
            </section>`;
    }

    function actividadFinal(unidad) {
        const final = unidad.actividad_final;
        if (!final) return '';
        const contenido = `Ir a la actividad final <i class="fas fa-arrow-right" aria-hidden="true"></i>`;
        return `
            <section class="u-final" id="actividad-final" aria-labelledby="h-final">
                <span class="u-final__icon"><i class="fas fa-flag-checkered" aria-hidden="true"></i></span>
                <div class="u-final__text">
                    <p class="u-eyebrow">Cierre de la unidad</p>
                    <h2 class="u-final__title" id="h-final">${UI.esc(final.nombre || 'Actividad final')}</h2>
                    ${final.descripcion ? `<p>${UI.esc(final.descripcion)}</p>` : ''}
                </div>
                ${UI.enlace({ url: final.url, contenido, clase: 'u-btn u-btn--primary' })}
            </section>`;
    }

    /**
     * Enlace del panel lateral. Si no hay URL, se muestra bloqueado y con un
     * mensaje (motivo) al pasar el cursor o enfocar con teclado.
     */
    function enlaceLateral({ url, contenido, clase = '', motivo }) {
        if (url) {
            return `<a class="u-side-link ${clase}" href="${UI.esc(DataManager.ruta(url))}">${contenido}</a>`;
        }
        return `
            <span class="u-side-link ${clase} is-pending" tabindex="0" aria-disabled="true" data-tooltip="${UI.esc(motivo)}">
                ${contenido}
                <span class="u-sr-only">(${UI.esc(motivo)})</span>
            </span>`;
    }

    function listaLateral(elementos) {
        if (!elementos.length) return '';
        return `<ul class="u-side-list">${elementos.map(e => `<li>${e}</li>`).join('')}</ul>`;
    }

    function bloqueLateral(titulo, contenido) {
        if (!contenido) return '';
        return `
            <div class="u-side-block">
                <p class="u-side-block__title">${titulo}</p>
                ${contenido}
            </div>`;
    }

    function lateral(unidad) {
        const competencias = UI.lista(unidad.competencias);

        const objetivo = unidad.objetivo ? `
            <p class="u-side-subtitle">Objetivo</p>
            <p class="u-side-text">${UI.esc(unidad.objetivo)}</p>` : '';

        const listaCompetencias = competencias.length ? `
            <p class="u-side-subtitle">Competencias</p>
            <ul class="u-side-checks">
                ${competencias.map(c => `<li><i class="fas fa-check" aria-hidden="true"></i><span>${UI.esc(c)}</span></li>`).join('')}
            </ul>` : '';

        // Actividades: bloqueadas si su tema está "Próximamente".
        const actividades = UI.actividades(unidad).map(a => enlaceLateral({
            url: a.disponible ? a.url : '',
            contenido: `<span class="u-side-list__num">${UI.esc(a.numero)}</span> <span>${UI.esc(a.nombre)}</span>`,
            motivo: a.temaDisponible ? MENSAJES.actividadEnConstruccion : MENSAJES.temaNoDisponible(a.numero)
        }));
        if (unidad.actividad_final) {
            actividades.push(enlaceLateral({
                url: unidad.actividad_final.url,
                contenido: `<i class="fas fa-flag-checkered" aria-hidden="true"></i> <span>Actividad final</span>`,
                clase: 'u-side-link--final',
                motivo: MENSAJES.actividadEnConstruccion
            }));
        }

        // El video de la unidad forma parte del material de apoyo.
        const material = [];
        if (unidad.video && unidad.video.url) {
            material.push(`
                <button class="u-side-link" type="button" id="btnVideo">
                    <i class="fas fa-circle-play" aria-hidden="true"></i> ${UI.esc(unidad.video.titulo || 'Video de la unidad')}
                </button>`);
        }
        UI.lista(unidad.material_apoyo).forEach(m => material.push(enlaceLateral({
            url: m.url,
            contenido: `<i class="fas fa-bookmark" aria-hidden="true"></i> <span>${UI.esc(m.nombre)}</span>`,
            motivo: MENSAJES.materialEnConstruccion
        })));


        return `
            <aside class="u-sidebar" aria-label="Información de la unidad">
                <div class="u-side-card">
                    ${bloqueLateral('Información académica', `${objetivo}${listaCompetencias}`)}
                    ${bloqueLateral('Actividades', listaLateral(actividades))}
                    ${bloqueLateral('Material de apoyo', listaLateral(material))}
                </div>
            </aside>`;
    }

    function navegacionUnidades(unidad, todas) {
        const indice = todas.findIndex(u => u.id === unidad.id);
        if (indice < 0) return '';
        const anterior = todas[indice - PASO_VECINO];
        const siguiente = todas[indice + PASO_VECINO];

        const enlaceVecino = (vecina, esAnterior) => {
            if (!vecina) return '<span></span>';
            return `
                <a class="u-pager__link ${esAnterior ? '' : 'is-next'}" href="${UI.esc(DataManager.urlUnidad(vecina.id))}">
                    <small>${esAnterior ? '<i class="fas fa-arrow-left" aria-hidden="true"></i> Unidad anterior' : 'Siguiente unidad <i class="fas fa-arrow-right" aria-hidden="true"></i>'}</small>
                    <span>Unidad ${UI.romano(vecina.numero)} · ${UI.esc(vecina.titulo)}</span>
                </a>`;
        };

        return `
            <nav class="u-pager" aria-label="Otras unidades">
                ${enlaceVecino(anterior, true)}
                ${enlaceVecino(siguiente, false)}
            </nav>`;
    }

    // ---------- Interacción ----------

    function iniciarVideo(unidad) {
        const boton = document.getElementById('btnVideo');
        if (!boton) return;
        boton.addEventListener('click', () => UI.abrirVideo({
            url: unidad.video.url,
            titulo: unidad.video.titulo || 'Video de la unidad'
        }));
    }

    /**
     * La introducción se ve completa al cargar; conforme el alumno baja,
     * se desvanece antes de salir de pantalla para dejar el foco en los temas.
     */
    function iniciarDesvanecimientoIntro() {
        const intro = document.getElementById('introduccion');
        if (!intro) return;
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let pendiente = false;

        const actualizar = () => {
            pendiente = false;
            const { top, height } = intro.getBoundingClientRect();
            // Línea de referencia: donde empieza el contenido (debajo de la barra de navegación).
            const referencia = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u-nav-offset')) || REFERENCIA_POR_DEFECTO_PX;
            const recorrido = height ? (referencia - top) / height : PROGRESO_MINIMO;
            const progreso = Math.min(PROGRESO_MAXIMO, Math.max(PROGRESO_MINIMO, recorrido));

            intro.style.opacity = String(OPACIDAD_MAXIMA - progreso);
            intro.style.transform = `translateY(${-progreso * DESPLAZAMIENTO_INTRO_PX}px)`;
            intro.classList.toggle('is-hidden', progreso >= PROGRESO_MAXIMO);
        };

        window.addEventListener('scroll', () => {
            if (!pendiente) {
                pendiente = true;
                requestAnimationFrame(actualizar);
            }
        }, { passive: true });

        actualizar();
    }

    // ---------- Arranque ----------

    document.addEventListener('DOMContentLoaded', async () => {
        const app = document.getElementById('unidad-app');
        const idUnidad = document.body.dataset.unidad;

        try {
            const unidad = await DataManager.getUnidad(idUnidad);
            // La navegación entre unidades es opcional: si el catálogo falla, la página se dibuja igual.
            const todas = await DataManager.getUnidades().catch(() => []);

            const numeral = UI.romano(unidad.numero);
            const primerTema = UI.lista(unidad.temas).find(t => t.url);

            document.title = `Unidad ${numeral}: ${unidad.titulo} | Aplicaciones para Comunicaciones en Red`;

            app.innerHTML = `
                ${hero(unidad, numeral, primerTema)}
                <div class="u-layout">
                    <div class="u-main">
                        ${introduccion(unidad)}
                        ${temas(unidad)}
                        ${actividadFinal(unidad)}
                    </div>
                    ${lateral(unidad)}
                </div>
                ${navegacionUnidades(unidad, todas)}`;

            app.setAttribute('aria-busy', 'false');

            UI.iniciarSelectorVista({
                contenedor: document.getElementById('listaTemas'),
                botones: Array.from(app.querySelectorAll('.u-topics-head [data-vista]')),
                clave: CLAVE_VISTA_TEMAS,
                vistaPorDefecto: VISTA_TEMAS_POR_DEFECTO
            });
            iniciarVideo(unidad);
            iniciarDesvanecimientoIntro();
        } catch (error) {
            UI.mostrarError(app, error);
        }
    });
})();
