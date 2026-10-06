// ==========================================================================
// PLANTILLA DE TEMA (unidades/unidad-XX/temas/tema-XX-YY.html)
// Lee <body data-unidad="unidad-XX" data-tema="X.Y">.
// El contenido del tema vive en el HTML (<article class="t-article">); este
// script solo dibuja lo que se repite en todos los temas:
//   - Desde assets/data/unidades/unidad-XX.json: índice lateral de la unidad
//     y navegación "Tema anterior" / siguiente paso.
//   - Desde el propio HTML: "En esta página" (elementos con data-toc),
//     progreso de lectura y botones de video (data-video).
// Si el JSON no carga, el tema se sigue leyendo con los enlaces de respaldo del HTML.
// Depende de: data-manager.js, unidades-ui.js
// ==========================================================================

(function () {
    const UI = UnidadesUI;
    const PORCENTAJE_MAXIMO = 100;
    const PROGRESO_MINIMO = 0;
    const PROGRESO_MAXIMO = 1;
    const MARGEN_SECCION_ACTIVA_PX = 24;
    const MARGEN_FINAL_PAGINA_PX = 4;
    const CONSULTA_MOVIL = '(max-width: 900px)';

    const MENSAJES = {
        temaNoDisponible: 'Próximamente',
        actividadEnConstruccion: 'Actividad en construcción',
        videoNoDisponible: 'Próximamente'
    };

    // ---------- Índice de la unidad ----------

    /** Enlace del índice; sin URL se muestra bloqueado con un candado. */
    function enlaceIndice({ url, contenido, clase = '', actual = false, motivo }) {
        if (url) {
            const claseActual = actual ? ' is-current' : '';
            const ariaActual = actual ? ' aria-current="page"' : '';
            return `<a class="t-index__link ${clase}${claseActual}"${ariaActual} href="${UI.esc(DataManager.ruta(url))}">${contenido}</a>`;
        }
        return `
            <span class="t-index__link ${clase} is-pending" aria-disabled="true" title="${UI.esc(motivo)}">
                ${contenido}
                <i class="fas fa-lock t-index__lock" aria-hidden="true"></i>
                <span class="u-sr-only">(${UI.esc(motivo)})</span>
            </span>`;
    }

    function indice(unidad, numeral, tema) {
        const temas = UI.lista(unidad.temas).map(t => `<li>${enlaceIndice({
            url: t.url,
            actual: t.numero === tema.numero,
            contenido: `<span class="t-index__num">${UI.esc(t.numero)}</span><span>${UI.esc(t.nombre)}</span>`,
            motivo: MENSAJES.temaNoDisponible
        })}</li>`);

        const extras = [];
        if (tema.actividad) {
            extras.push(`<li>${enlaceIndice({
                url: tema.url && tema.actividad.url,
                contenido: `<i class="fas fa-pen-to-square" aria-hidden="true"></i><span>Actividad ${UI.esc(tema.numero)}</span>`,
                motivo: MENSAJES.actividadEnConstruccion
            })}</li>`);
        }
        if (unidad.actividad_final) {
            extras.push(`<li>${enlaceIndice({
                url: unidad.actividad_final.url,
                clase: 't-index__link--final',
                contenido: '<i class="fas fa-flag-checkered" aria-hidden="true"></i><span>Actividad final</span>',
                motivo: MENSAJES.actividadEnConstruccion
            })}</li>`);
        }

        return `
            <details class="t-index__details" open>
                <summary class="t-index__summary">
                    <span>
                        <span class="t-index__eyebrow">Unidad ${numeral}</span>
                        <span class="t-index__unit">${UI.esc(unidad.titulo)}</span>
                    </span>
                    <i class="fas fa-chevron-down t-index__chevron" aria-hidden="true"></i>
                </summary>
                <ol class="t-index__list" aria-label="Temas de la unidad">${temas.join('')}</ol>
                ${extras.length ? `<ul class="t-index__list" aria-label="Actividades">${extras.join('')}</ul>` : ''}
            </details>`;
    }

    /** En escritorio el índice siempre está abierto; en móvil inicia plegado. */
    function iniciarIndiceDesplegable(contenedor) {
        const detalles = contenedor.querySelector('.t-index__details');
        if (!detalles) return;
        const resumen = detalles.querySelector('summary');
        const consulta = matchMedia(CONSULTA_MOVIL);

        const ajustar = () => {
            detalles.open = !consulta.matches;
            resumen.tabIndex = consulta.matches ? 0 : -1;
        };
        resumen.addEventListener('click', e => { if (!consulta.matches) e.preventDefault(); });
        consulta.addEventListener('change', ajustar);
        ajustar();
    }

    // ---------- Navegación entre temas ----------

    /**
     * Izquierda: tema anterior disponible (o la unidad si es el primero).
     * Derecha: actividad del tema → siguiente tema → actividad final.
     */
    function navegacion(unidad, tema) {
        const temas = UI.lista(unidad.temas);
        const posicion = temas.findIndex(t => t.numero === tema.numero);
        const anterior = temas.slice(0, posicion).reverse().find(t => t.url);
        const siguiente = temas.slice(posicion + 1).find(t => t.url);

        const izquierda = anterior
            ? `<a class="t-pager__prev" href="${UI.esc(DataManager.ruta(anterior.url))}" title="${UI.esc(`${anterior.numero} ${anterior.nombre}`)}">
                   <i class="fas fa-arrow-left" aria-hidden="true"></i> Tema anterior
               </a>`
            : `<a class="t-pager__prev" href="${UI.esc(DataManager.urlUnidad(unidad.id))}">
                   <i class="fas fa-arrow-left" aria-hidden="true"></i> Volver a la unidad
               </a>`;

        let destino = null;
        if (tema.actividad && tema.actividad.url) {
            destino = { url: tema.actividad.url, texto: `Ir a la actividad ${tema.numero}` };
        } else if (siguiente) {
            destino = { url: siguiente.url, texto: `Siguiente: tema ${siguiente.numero}` };
        } else if (unidad.actividad_final && unidad.actividad_final.url) {
            destino = { url: unidad.actividad_final.url, texto: 'Ir a la actividad final' };
        }

        const derecha = destino
            ? `<a class="u-btn u-btn--primary" href="${UI.esc(DataManager.ruta(destino.url))}">
                   ${UI.esc(destino.texto)} <i class="fas fa-arrow-right" aria-hidden="true"></i>
               </a>`
            : '';

        return `${izquierda}${derecha}`;
    }

    // ---------- En esta página + progreso de lectura ----------

    function iniciarLectura() {
        const articulo = document.querySelector('.t-article');
        if (!articulo) return;

        const lista = document.getElementById('temaTabla');
        const secciones = Array.from(articulo.querySelectorAll('[data-toc][id]'));
        if (lista) {
            lista.innerHTML = secciones.map(s =>
                `<li><a class="t-toc__link" href="#${UI.esc(s.id)}">${UI.esc(s.dataset.toc)}</a></li>`).join('');
        }
        const enlaces = lista ? Array.from(lista.querySelectorAll('.t-toc__link')) : [];

        const barra = document.getElementById('progresoBarra');
        const valor = document.getElementById('progresoValor');
        const pista = barra ? barra.parentElement : null;

        let pendiente = false;

        const actualizar = () => {
            pendiente = false;

            // Progreso: cuánto del artículo ya pasó por la pantalla.
            const { top, height } = articulo.getBoundingClientRect();
            const recorrido = height - window.innerHeight;
            const avance = recorrido > 0 ? -top / recorrido : PROGRESO_MAXIMO;
            const porcentaje = Math.round(Math.min(PROGRESO_MAXIMO, Math.max(PROGRESO_MINIMO, avance)) * PORCENTAJE_MAXIMO);
            if (barra) barra.style.width = `${porcentaje}%`;
            if (valor) valor.textContent = `${porcentaje} %`;
            if (pista) pista.setAttribute('aria-valuenow', String(porcentaje));

            // Sección activa: la última cuyo inicio ya pasó bajo la barra de navegación.
            if (!enlaces.length) return;
            const referencia = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u-nav-offset')) + MARGEN_SECCION_ACTIVA_PX;
            const alFinal = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - MARGEN_FINAL_PAGINA_PX;
            let activa = 0;
            secciones.forEach((seccion, i) => {
                if (seccion.getBoundingClientRect().top <= referencia) activa = i;
            });
            if (alFinal) activa = secciones.length - 1;
            enlaces.forEach((enlace, i) => {
                enlace.classList.toggle('is-active', i === activa);
                if (i === activa) enlace.setAttribute('aria-current', 'location');
                else enlace.removeAttribute('aria-current');
            });
        };

        const programar = () => {
            if (!pendiente) {
                pendiente = true;
                requestAnimationFrame(actualizar);
            }
        };
        window.addEventListener('scroll', programar, { passive: true });
        window.addEventListener('resize', programar);
        actualizar();
    }

    // ---------- Video ----------

    /** Botones con data-video="https://www.youtube.com/embed/..."; sin URL quedan deshabilitados. */
    function iniciarVideos() {
        document.querySelectorAll('.t-article [data-video]').forEach(boton => {
            const url = boton.dataset.video;
            if (!url) {
                boton.disabled = true;
                boton.textContent = MENSAJES.videoNoDisponible;
                return;
            }
            boton.addEventListener('click', () => UI.abrirVideo({
                url,
                titulo: boton.dataset.videoTitulo || 'Video del tema'
            }));
        });
    }

    // ---------- Arranque ----------

    document.addEventListener('DOMContentLoaded', async () => {
        iniciarLectura();
        iniciarVideos();

        const contenedorIndice = document.getElementById('temaIndice');
        const contenedorNavegacion = document.getElementById('temaNavegacion');
        const { unidad: idUnidad, tema: numeroTema } = document.body.dataset;

        try {
            const unidad = await DataManager.getUnidad(idUnidad);
            const tema = UI.lista(unidad.temas).find(t => t.numero === numeroTema);
            if (!tema) throw new Error(`El tema ${numeroTema} no aparece en la lista "temas" de ${idUnidad}.json.`);

            const numeral = UI.romano(unidad.numero);
            document.title = `${tema.numero} ${tema.nombre} | Unidad ${numeral} | Aplicaciones para Comunicaciones en Red`;

            if (contenedorIndice) {
                contenedorIndice.innerHTML = indice(unidad, numeral, tema);
                iniciarIndiceDesplegable(contenedorIndice);
            }
            if (contenedorNavegacion) contenedorNavegacion.innerHTML = navegacion(unidad, tema);
        } catch (error) {
            // Se conservan los enlaces de respaldo escritos en el HTML.
            console.error(error);
        }
    });
})();
