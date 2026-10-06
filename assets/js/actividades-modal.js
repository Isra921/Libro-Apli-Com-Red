// ==========================================================================
// VENTANA EMERGENTE · ACTIVIDADES
// --------------------------------------------------------------------------
// - Los datos viven en assets/data/actividades.json.
// - Solo construye el contenido (tarjetas de actividades); la ventana,
//   las pestañas y la accesibilidad las pone ventana-modal.js.
// - Se abre con cualquier elemento [data-modal="actividades"].
// - Requiere data-manager.js y ventana-modal.js (cargados antes).
// ==========================================================================
(function () {
    const ID_VENTANA = 'actividades';
    const RUTA_DATOS = 'assets/data/actividades.json';
    const { el, icono } = VentanaModal;

    function crearTarjeta(item) {
        const tarjeta = el('article', `act-card ${item.destacada ? 'act-card--destacada' : ''}`);

        const encabezado = el('div', 'act-card__head');
        const badgeTag = el('span', `act-chip ${item.destacada ? 'act-chip--destacada' : ''}`, item.tag);
        encabezado.append(badgeTag);

        const meta = el('div', 'act-card__meta');
        if (item.reactivos) {
            const spanReactivos = el('span', 'act-meta');
            spanReactivos.append(icono('fa-list-ol'), ` ${item.reactivos}`);
            meta.append(spanReactivos);
        }
        if (item.tiempo) {
            const spanTiempo = el('span', 'act-meta');
            spanTiempo.append(icono('fa-clock'), ` ${item.tiempo}`);
            meta.append(spanTiempo);
        }
        encabezado.append(meta);
        tarjeta.append(encabezado);

        const cuerpo = el('div', 'act-card__body');
        const titulo = el('h4', 'act-card__titulo', item.titulo);
        const desc = el('p', 'act-card__desc', item.descripcion);
        cuerpo.append(titulo, desc);
        tarjeta.append(cuerpo);

        const pie = el('div', 'act-card__foot');
        const enlace = el('a', `act-btn ${item.destacada ? 'act-btn--destacada' : ''}`);
        enlace.href = DataManager.ruta(item.url);
        enlace.append(icono(item.icono || 'fa-arrow-right'), ` ${item.destacada ? 'Comenzar evaluación integradora' : 'Iniciar actividad'}`);
        pie.append(enlace);
        tarjeta.append(pie);

        return tarjeta;
    }

    function contenidoSeccion(seccion, conPestanas) {
        const fragmento = document.createDocumentFragment();
        if (!conPestanas) fragmento.append(el('h3', 'act-panel__titulo', seccion.titulo));
        if (seccion.descripcion) fragmento.append(el('p', 'act-panel__desc', seccion.descripcion));

        const grid = el('div', 'act-grid');
        (seccion.items || []).forEach(item => grid.append(crearTarjeta(item)));
        fragmento.append(grid);

        if (seccion.nota) {
            const nota = el('div', 'act-nota');
            nota.append(icono('fa-info-circle'), ` ${seccion.nota}`);
            fragmento.append(nota);
        }

        return fragmento;
    }

    VentanaModal.registrar(ID_VENTANA, async () => {
        const datos = await DataManager.getArchivo(RUTA_DATOS);
        const conPestanas = datos.secciones.length > 1;
        return {
            titulo: datos.titulo,
            botonCerrar: datos.boton_cerrar,
            secciones: datos.secciones.map(seccion => ({
                id: seccion.id,
                pestana: seccion.pestana,
                contenido: contenidoSeccion(seccion, conPestanas)
            }))
        };
    });
})();
