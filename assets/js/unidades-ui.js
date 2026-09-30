// ==========================================================================
// UNIDADES UI · Utilidades de interfaz compartidas
// Usado por: unidades.html, unidades/unidad-XX/index.html y unidades/unidad-XX/temas/*.html
// Depende de: data-manager.js
// ==========================================================================

const UnidadesUI = {
    CANTIDAD_SINGULAR: 1,

    NUMERALES_ROMANOS: [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ],

    CLAVE_PREFERENCIAS: 'polilibro-acr:preferencias',

    /** Escapa texto para insertarlo en HTML de forma segura. */
    esc(valor) {
        const div = document.createElement('div');
        div.textContent = valor ?? '';
        return div.innerHTML;
    },

    /** 3 -> "III" */
    romano(numero) {
        let restante = Number(numero);
        if (!Number.isFinite(restante) || restante <= 0) return this.esc(numero);
        return this.NUMERALES_ROMANOS.reduce((resultado, [valor, simbolo]) => {
            while (restante >= valor) {
                resultado += simbolo;
                restante -= valor;
            }
            return resultado;
        }, '');
    },

    /** plural(2, 'tema', 'temas') -> "2 temas" */
    plural(cantidad, singular, pluralTexto) {
        return `${cantidad} ${cantidad === this.CANTIDAD_SINGULAR ? singular : pluralTexto}`;
    },

    /** Lista segura: si el campo no existe en el JSON, devuelve []. */
    lista(valor) {
        return Array.isArray(valor) ? valor : [];
    },

    /**
     * Actividades de aprendizaje de una unidad: cada tema puede tener una.
     * Una actividad está disponible solo si existe la página del tema Y la de la actividad.
     */
    actividades(unidad) {
        return this.lista(unidad && unidad.temas)
            .filter(tema => tema.actividad)
            .map(tema => ({
                numero: tema.numero,
                nombre: tema.actividad.nombre,
                url: tema.actividad.url,
                temaDisponible: Boolean(tema.url),
                disponible: Boolean(tema.url && tema.actividad.url)
            }));
    },

    /**
     * Crea un enlace si hay URL; si la URL está vacía, un elemento
     * deshabilitado con la etiqueta "Próximamente".
     */
    enlace({ url, contenido, clase = '' }) {
        if (url) {
            return `<a class="${clase}" href="${this.esc(DataManager.ruta(url))}">${contenido}</a>`;
        }
        return `<span class="${clase} is-pending" aria-disabled="true">${contenido}<small class="u-pending-label">Próximamente</small></span>`;
    },

    /** Muestra un mensaje de error comprensible dentro de un contenedor. */
    mostrarError(contenedor, error) {
        console.error(error);
        const archivo = error && error.archivo
            ? `<p class="u-alert__file"><i class="fas fa-file-code" aria-hidden="true"></i> ${this.esc(error.archivo)}</p>`
            : '';
        contenedor.innerHTML = `
            <div class="u-alert" role="alert">
                <i class="fas fa-triangle-exclamation u-alert__icon" aria-hidden="true"></i>
                <div>
                    <p class="u-alert__title">No se pudo cargar el contenido</p>
                    <p>${this.esc(error && error.message ? error.message : 'Error desconocido.')}</p>
                    ${archivo}
                </div>
            </div>`;
        contenedor.setAttribute('aria-busy', 'false');
    },

    /**
     * Reproductor de video en un <dialog> (plantilla de unidad y de tema).
     * El diálogo se crea la primera vez y se reutiliza. Al cerrarlo
     * (botón, clic fuera o Esc) se detiene la reproducción.
     */
    abrirVideo({ url, titulo = 'Video' }) {
        let dialogo = document.getElementById('videoModal');
        if (!dialogo) {
            document.body.insertAdjacentHTML('beforeend', `
                <dialog class="u-video" id="videoModal">
                    <div class="u-video__frame">
                        <iframe allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
                    </div>
                    <button class="u-video__close" type="button" aria-label="Cerrar video">
                        <i class="fas fa-xmark" aria-hidden="true"></i>
                    </button>
                </dialog>`);
            dialogo = document.getElementById('videoModal');
            const frameNuevo = dialogo.querySelector('iframe');
            dialogo.querySelector('.u-video__close').addEventListener('click', () => dialogo.close());
            dialogo.addEventListener('click', e => { if (e.target === dialogo) dialogo.close(); });
            dialogo.addEventListener('close', () => { frameNuevo.src = ''; });
        }
        const frame = dialogo.querySelector('iframe');
        dialogo.setAttribute('aria-label', titulo);
        frame.title = titulo;
        frame.src = url;
        dialogo.showModal();
    },

    VISTAS: { TARJETAS: 'tarjetas', LISTA: 'lista' },

    /**
     * Selector Tarjetas/Lista reutilizable (unidades.html y plantilla de unidad).
     * - contenedor: elemento al que se le agrega/quita la clase "is-list".
     * - botones: botones con data-vista="tarjetas" | "lista".
     * - clave: nombre con el que se recuerda la elección del visitante.
     */

    iniciarSelectorVista({ contenedor, botones, clave, vistaPorDefecto }) {
        if (!contenedor || !botones.length) return;

        const aplicar = vista => {
            contenedor.classList.toggle('is-list', vista === this.VISTAS.LISTA);
            botones.forEach(boton => boton.setAttribute('aria-pressed', String(boton.dataset.vista === vista)));
        };

        aplicar(this.leerPreferencia(clave, vistaPorDefecto));

        botones.forEach(boton => {
            boton.addEventListener('click', () => {
                aplicar(boton.dataset.vista);
                this.guardarPreferencia(clave, boton.dataset.vista);
            });
        });
    },

    /** Preferencias del visitante (ej. vista de tarjetas o lista). Nunca rompe la página. */
    leerPreferencia(clave, valorPorDefecto) {
        try {
            const datos = JSON.parse(localStorage.getItem(this.CLAVE_PREFERENCIAS) || '{}');
            return datos[clave] ?? valorPorDefecto;
        } catch (error) {
            return valorPorDefecto;
        }
    },

    guardarPreferencia(clave, valor) {
        try {
            const datos = JSON.parse(localStorage.getItem(this.CLAVE_PREFERENCIAS) || '{}');
            datos[clave] = valor;
            localStorage.setItem(this.CLAVE_PREFERENCIAS, JSON.stringify(datos));
        } catch (error) {
            /* Almacenamiento no disponible: se ignora. */
        }
    }
};
