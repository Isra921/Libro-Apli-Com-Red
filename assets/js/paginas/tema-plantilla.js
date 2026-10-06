// ==========================================================================
// PLANTILLA DE TEMA (unidades/unidad-XX/temas/tema-XX-YY.html)
// Lee <body data-unidad="unidad-XX" data-tema="X.Y">.
// El contenido del tema vive en el HTML (<article class="t-article">); este
// script solo dibuja lo que se repite en todos los temas:
//   - Desde assets/data/unidades/unidad-XX.json: índice lateral de la unidad
//     y navegación "Tema anterior" / siguiente paso.
//   - Desde el propio HTML: "En esta página" (elementos con data-toc),
//     progreso de lectura y botones de video (data-video).
//   - Desde referencias.json de la unidad + referencias-config.json:
//     número y nota de las figuras (data-fuentes), citas en el texto (data-citas)
//     y tarjeta del video del tema (data-referencia).
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

    // ---------- Figuras: número, título y nota (APA 7) ----------
    // Cada figura del tema se marca así (las fuentes son los "id" de referencias.json):
    //   <figure class="t-figure" data-fuentes="kotler-2017 middleton-2009">
    //     <figcaption>Título de la figura</figcaption>
    //     <div class="t-figure__media"><img …></div>
    //   </figure>
    // Arriba queda "Figura 1.1" + título en cursiva; abajo, "Nota. Elaboración propia
    // con base en Kotler et al. (2017) y Middleton et al. (2009)."
    // La numeración es continua en la unidad: se cuentan las figuras de los temas
    // anteriores (en el orden de la lista "temas" del JSON de la unidad).

    const SELECTOR_FIGURA = 'figure.t-figure[data-fuentes]';

    /** Une una lista con comas y el conector final: "A, B y C". */
    function unir(lista, conector) {
        if (lista.length <= 1) return lista.join('');
        return `${lista.slice(0, -1).join(', ')} ${conector} ${lista[lista.length - 1]}`;
    }

    /** Cuenta las figuras de los temas anteriores al actual (null si alguno no se pudo leer). */
    async function figurasPrevias(temas, temaActual) {
        const anteriores = temas.slice(0, temas.indexOf(temaActual)).filter(t => t.url);
        const conteos = await Promise.all(anteriores.map(async t => {
            const respuesta = await fetch(DataManager.ruta(t.url));
            if (!respuesta.ok) throw new Error(`No se pudo leer ${t.url} para numerar las figuras.`);
            const html = new DOMParser().parseFromString(await respuesta.text(), 'text/html');
            return html.querySelectorAll(SELECTOR_FIGURA).length;
        }));
        return conteos.reduce((total, n) => total + n, 0);
    }

    /** Busca una referencia por id; avisa en consola si no existe. */
    function buscarReferencia(referencias, id, origen) {
        const ref = referencias.find(r => r.id === id);
        if (!ref) console.warn(`[${origen}] La referencia "${id}" no existe en referencias.json de la unidad.`);
        return ref;
    }

    /** Lista de ids escrita en un atributo: "kotler-2017 middleton-2009". */
    function ids(atributo) {
        return atributo.split(/\s+/).filter(Boolean);
    }

    async function prepararFiguras(unidad, temaActual, config, referencias) {
        const figuras = [...document.querySelectorAll(`.t-article ${SELECTOR_FIGURA}`)];
        if (!figuras.length) return;

        const previas = await figurasPrevias(UI.lista(unidad.temas), temaActual).catch(error => {
            console.error(error);
            return null; // sin conteo confiable no se numera, pero sí se pone la nota
        });
        const notas = config.notas;

        figuras.forEach((figura, indice) => {
            const pie = figura.querySelector('figcaption');
            if (pie) {
                const titulo = document.createElement('span');
                titulo.className = 't-figure__titulo';
                titulo.textContent = pie.textContent.trim();
                pie.replaceChildren(titulo);
                if (previas !== null) {
                    const numero = document.createElement('strong');
                    numero.className = 't-figure__num';
                    numero.textContent = `${notas.figura} ${unidad.numero}.${previas + indice + 1}`;
                    pie.prepend(numero);
                }
            }

            const citas = ids(figura.dataset.fuentes)
                .map(id => buscarReferencia(referencias, id, 'Figura'))
                .filter(Boolean)
                .map(ref => ref.cita);
            if (!citas.length) return;

            const nota = document.createElement('p');
            nota.className = 't-figure__nota';
            const etiqueta = document.createElement('em');
            etiqueta.textContent = notas.nota;
            nota.append(etiqueta, ` ${notas.nota_prefijo} ${unir(citas, notas.conector)}.`);
            figura.querySelector('.t-figure__media').after(nota);
        });
    }

    // ---------- Citas en el texto (APA 7, forma parentética) ----------
    // En el HTML solo se marca el lugar de la cita, antes del punto final:
    //   … u otros motivos <span class="t-cita" data-citas="naciones-unidas-2010 omt-2019"></span>.
    // y aquí se arma "(Naciones Unidas, 2010; Organización Mundial del Turismo [OMT], 2019)".
    // - El texto sale del campo "cita" de referencias.json ("Autor (año)" → "Autor, año").
    // - Si la referencia tiene "cita_corta" (ej. "OMT (2019)"), se usa a partir de
    //   la segunda vez que aparece en la página (la primera presenta la abreviatura).
    // - Cada cita enlaza a Referencias filtrada por la unidad y el tema; al pasar
    //   el cursor se ve la referencia completa.

    const SELECTOR_CITA = '.t-article .t-cita[data-citas]';
    const PATRON_CITA_NARRATIVA = /^(.*\S)\s*\((.+)\)$/;
    const PATRON_CURSIVAS = /\*/g;

    /** "Kotler et al. (2017)" → "Kotler et al., 2017". */
    function citaParentetica(cita) {
        const partes = cita.match(PATRON_CITA_NARRATIVA);
        return partes ? `${partes[1]}, ${partes[2]}` : cita;
    }

    /** Sustituye {marcadores} de las plantillas de texto del JSON. */
    function plantilla(texto, valores) {
        return texto.replace(/\{(\w+)\}/g, (_, clave) => valores[clave] ?? '');
    }

    function prepararCitas(config, referencias, idUnidad, numeroTema) {
        const marcas = [...document.querySelectorAll(SELECTOR_CITA)];
        if (!marcas.length) return;

        const textos = config.citas;
        const destino = DataManager.urlReferencias(idUnidad, numeroTema);
        const usadas = new Set();

        marcas.forEach(marca => {
            const enlaces = ids(marca.dataset.citas)
                .map(id => buscarReferencia(referencias, id, 'Cita'))
                .filter(Boolean)
                .map(ref => {
                    const cita = usadas.has(ref.id) && ref.cita_corta ? ref.cita_corta : ref.cita;
                    usadas.add(ref.id);
                    const enlace = document.createElement('a');
                    enlace.href = destino;
                    enlace.textContent = citaParentetica(cita);
                    enlace.title = plantilla(textos.titulo_enlace, {
                        referencia: ref.referencia.replace(PATRON_CURSIVAS, '')
                    });
                    return enlace;
                });
            if (!enlaces.length) return;

            const partes = enlaces.flatMap((enlace, i) => (i ? [textos.separador, enlace] : [enlace]));
            marca.replaceChildren(textos.apertura, ...partes, textos.cierre);
        });
    }

    // ---------- Video del tema ----------
    // En el HTML solo se marca el lugar (oculto hasta que se llena):
    //   <section class="t-video" id="video-tema" data-toc="Video del tema"
    //            data-referencia="salas-ramirez-2026c" hidden></section>
    // La referencia (categoría "audiovisual") lleva además:
    //   "video": { "embed": "https://www.youtube.com/embed/…", "duracion": "4:05" }
    // Se muestra "Video: <nombre del tema>", el video de YouTube incrustado y debajo
    // la duración y la fuente (cita enlazada a Referencias, como en las figuras).

    const SELECTOR_VIDEO = '.t-article .t-video[data-referencia]';
    const PERMISOS_IFRAME = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

    function crear(etiqueta, clase, ...contenido) {
        const nodo = document.createElement(etiqueta);
        if (clase) nodo.className = clase;
        nodo.append(...contenido);
        return nodo;
    }

    function prepararVideos(config, referencias, tema, destino) {
        const textos = config.videos;
        document.querySelectorAll(SELECTOR_VIDEO).forEach(seccion => {
            const ref = buscarReferencia(referencias, seccion.dataset.referencia, 'Video');
            if (!ref) return;
            if (!ref.video || !ref.video.embed) {
                console.warn(`[Video] La referencia "${ref.id}" no tiene el campo "video" con "embed".`);
                return;
            }
            const titulo = plantilla(textos.titulo, { tema: tema.nombre });

            const icono = crear('i', 'fas fa-circle-play');
            icono.setAttribute('aria-hidden', 'true');
            const encabezado = crear('div', 't-video__head',
                crear('span', 't-video__icon', icono),
                crear('p', 't-video__title', titulo));

            const iframe = document.createElement('iframe');
            iframe.src = ref.video.embed;
            iframe.title = titulo;
            iframe.loading = 'lazy';
            iframe.allow = PERMISOS_IFRAME;
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            iframe.allowFullscreen = true;

            const fuente = crear('a', '', ref.cita);
            fuente.href = destino;
            fuente.title = plantilla(config.citas.titulo_enlace, {
                referencia: ref.referencia.replace(PATRON_CURSIVAS, '')
            });
            const meta = crear('p', 't-video__meta');
            if (ref.video.duracion) meta.append(`${plantilla(textos.duracion, { duracion: ref.video.duracion })} · `);
            meta.append(`${textos.fuente} `, fuente);

            seccion.replaceChildren(encabezado, crear('div', 't-video__frame', iframe), meta);
            seccion.hidden = false;
        });
    }

    /** Figuras, citas y videos usan los mismos dos JSON: se cargan una sola vez. */
    async function prepararReferencias(unidad, tema) {
        const hayFiguras = document.querySelector(`.t-article ${SELECTOR_FIGURA}`);
        const hayCitas = document.querySelector(SELECTOR_CITA);
        const hayVideos = document.querySelector(SELECTOR_VIDEO);
        if (!hayFiguras && !hayCitas && !hayVideos) return;
        if (!unidad.referencias) {
            console.warn(`[Referencias] ${unidad.id}.json no tiene el campo "referencias".`);
            return;
        }

        const [config, datos] = await Promise.all([
            DataManager.getArchivo(DataManager.RUTA_REFERENCIAS_CONFIG),
            DataManager.getArchivo(unidad.referencias)
        ]);
        prepararCitas(config, datos.referencias, unidad.id, tema.numero);
        prepararVideos(config, datos.referencias, tema, DataManager.urlReferencias(unidad.id, tema.numero));
        await prepararFiguras(unidad, tema, config, datos.referencias);
    }

    // ---------- Arranque ----------

    document.addEventListener('DOMContentLoaded', async () => {
        iniciarLectura();
        iniciarVideos();

        const contenedorIndice = document.getElementById('temaIndice');
        const contenedorNavegacion = document.getElementById('temaNavegacion');
        const { unidad: idUnidad, tema: numeroTema } = document.body.dataset;

        // "Ver lista completa" abre Referencias filtrada por esta unidad y tema
        document.querySelectorAll('[data-enlace-referencias]').forEach(enlace => {
            enlace.href = DataManager.urlReferencias(idUnidad, numeroTema);
        });

        try {
            const unidad = await DataManager.getUnidad(idUnidad);
            const tema = UI.lista(unidad.temas).find(t => t.numero === numeroTema);
            if (!tema) throw new Error(`El tema ${numeroTema} no aparece en la lista "temas" de ${idUnidad}.json.`);

            const numeral = UI.romano(unidad.numero);
            document.title = `${tema.numero} ${tema.nombre} | Unidad ${numeral} | Marketing`;

            if (contenedorIndice) {
                contenedorIndice.innerHTML = indice(unidad, numeral, tema);
                iniciarIndiceDesplegable(contenedorIndice);
            }
            if (contenedorNavegacion) contenedorNavegacion.innerHTML = navegacion(unidad, tema);
            await prepararReferencias(unidad, tema);
        } catch (error) {
            // Se conservan los enlaces de respaldo escritos en el HTML.
            console.error(error);
        }
    });
})();
