// ==========================================================================
// VENTANA EMERGENTE · GLOSARIO DE TÉRMINOS
// --------------------------------------------------------------------------
// - Los términos viven en assets/data/glosario.json, agrupados por unidad
//   (una pestaña por unidad; con una sola unidad no se muestran pestañas).
// - Los términos se ordenan alfabéticamente aquí (no importa el orden del
//   JSON) y se agrupan por letra inicial.
// - Buscador: filtra por término o por palabras de la definición, sin
//   distinguir mayúsculas ni acentos.
// - Se abre con cualquier elemento [data-modal="glosario"].
// - Requiere data-manager.js y ventana-modal.js (cargados antes).
// ==========================================================================
(function () {
    const ID_VENTANA = 'glosario';
    const RUTA_DATOS = 'assets/data/glosario.json';
    const IDIOMA = 'es';
    const { el, icono } = VentanaModal;

    /** Texto en minúsculas y sin acentos, para comparar. */
    function normalizar(texto) {
        return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    }

    /** Sustituye {marcadores} de las plantillas de texto del JSON. */
    function plantilla(texto, valores) {
        return texto.replace(/\{(\w+)\}/g, (_, clave) => valores[clave] ?? '');
    }

    /** Letra inicial sin acento (Á → A) para agrupar. */
    function letraDe(termino) {
        return normalizar(termino).charAt(0).toUpperCase();
    }

    function contenidoUnidad(unidad, textos) {
        const contenedor = el('div', 'gl');
        const terminos = [...unidad.terminos]
            .sort((a, b) => a.termino.localeCompare(b.termino, IDIOMA, { sensitivity: 'base' }));
        const total = terminos.length;

        // ---- Buscador ----
        const idBuscador = `gl-buscar-${unidad.id}`;
        const barra = el('div', 'gl__barra');
        const etiqueta = el('label', 'gl__etiqueta', textos.buscador_etiqueta);
        etiqueta.htmlFor = idBuscador;
        const campo = el('div', 'gl__campo');
        const buscador = el('input', 'gl__buscador');
        buscador.type = 'search';
        buscador.id = idBuscador;
        buscador.placeholder = textos.buscador_placeholder;
        buscador.autocomplete = 'off';
        campo.append(icono('fa-magnifying-glass'), buscador);
        const contador = el('p', 'gl__contador');
        contador.setAttribute('aria-live', 'polite');
        barra.append(etiqueta, campo, contador);

        // ---- Lista agrupada por letra ----
        const lista = el('div', 'gl__lista');
        const grupos = new Map();
        terminos.forEach(item => {
            const letra = letraDe(item.termino);
            if (!grupos.has(letra)) {
                const grupo = el('section', 'gl__grupo');
                grupo.append(el('h3', 'gl__letra', letra));
                const dl = el('dl', 'gl__terminos');
                grupo.append(dl);
                grupos.set(letra, { grupo, dl });
                lista.append(grupo);
            }
            const entrada = el('div', 'gl__entrada');
            entrada.dataset.busqueda = normalizar(`${item.termino} ${item.definicion}`);
            entrada.append(el('dt', 'gl__termino', item.termino), el('dd', 'gl__definicion', item.definicion));
            grupos.get(letra).dl.append(entrada);
        });

        const vacio = el('p', 'gl__vacio');
        vacio.hidden = true;

        // ---- Filtrado ----
        function filtrar() {
            const consulta = normalizar(buscador.value);
            let visibles = 0;
            lista.querySelectorAll('.gl__entrada').forEach(entrada => {
                const coincide = !consulta || entrada.dataset.busqueda.includes(consulta);
                entrada.hidden = !coincide;
                if (coincide) visibles += 1;
            });
            grupos.forEach(({ grupo, dl }) => {
                grupo.hidden = !dl.querySelector('.gl__entrada:not([hidden])');
            });
            contador.textContent = consulta
                ? plantilla(textos.contador_filtrado, { visibles, total })
                : plantilla(textos.contador_total, { total });
            vacio.hidden = visibles > 0;
            vacio.textContent = plantilla(textos.sin_resultados, { busqueda: buscador.value.trim() });
        }

        buscador.addEventListener('input', filtrar);
        filtrar();

        contenedor.append(barra, lista, vacio);
        return contenedor;
    }

    VentanaModal.registrar(ID_VENTANA, async () => {
        const datos = await DataManager.getArchivo(RUTA_DATOS);
        return {
            titulo: datos.titulo,
            botonCerrar: datos.boton_cerrar,
            secciones: datos.unidades.map(unidad => ({
                id: unidad.id,
                pestana: unidad.pestana,
                contenido: contenidoUnidad(unidad, datos.textos)
            }))
        };
    });
})();
