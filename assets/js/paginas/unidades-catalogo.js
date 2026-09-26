// ==========================================================================
// CATÁLOGO DE UNIDADES (unidades.html)
// Lee assets/data/unidades-data.json + un JSON por unidad y dibuja las tarjetas.
// Depende de: data-manager.js, unidades-ui.js
// ==========================================================================

(function () {
    const UI = UnidadesUI;
    const CLAVE_VISTA = 'vistaUnidades';
    const VISTA_POR_DEFECTO = UI.VISTAS.TARJETAS;

    function tarjetaUnidad(unidad, indice) {
        const temas = UI.lista(unidad.temas);
        const actividades = UI.actividades(unidad);

        const listaTemas = temas.map(tema => `
            <li>
                <span class="u-topic-mini__num">${UI.esc(tema.numero)}</span>
                <span>${UI.esc(tema.nombre)}</span>
            </li>`).join('');

        const chipFinal = unidad.actividad_final
            ? `<span class="u-chip u-chip--accent"><i class="fas fa-flag-checkered" aria-hidden="true"></i> Actividad final</span>`
            : '';

        const chipDuracion = unidad.duracion_horas
            ? `<span class="u-chip u-chip--soft"><i class="far fa-clock" aria-hidden="true"></i> ${UI.esc(unidad.duracion_horas)} h</span>`
            : '';

        return `
            <article class="u-unit-card" style="--orden:${indice}" aria-labelledby="titulo-${UI.esc(unidad.id)}">
                <header class="u-unit-card__head">
                    <div class="u-numeral" aria-hidden="true">
                        <span class="u-numeral__label">Unidad</span>
                        <span class="u-numeral__value">${UI.romano(unidad.numero)}</span>
                    </div>
                    ${chipDuracion}
                </header>

                <div class="u-unit-card__body">
                    <h2 class="u-unit-card__title" id="titulo-${UI.esc(unidad.id)}">
                        <span class="u-sr-only">Unidad ${UI.romano(unidad.numero)}: </span>${UI.esc(unidad.titulo)}
                    </h2>
                    <p class="u-unit-card__desc">${UI.esc(unidad.descripcion)}</p>
                    ${temas.length ? `<ol class="u-topic-mini" aria-label="Temas de la unidad">${listaTemas}</ol>` : ''}
                </div>

                <footer class="u-unit-card__foot">
                    <div class="u-unit-card__meta">
                        <span class="u-chip"><i class="fas fa-book-open" aria-hidden="true"></i> ${UI.plural(temas.length, 'tema', 'temas')}</span>
                        <span class="u-chip"><i class="fas fa-list-check" aria-hidden="true"></i> ${UI.plural(actividades.length, 'actividad', 'actividades')}</span>
                        ${chipFinal}
                    </div>
                    <a class="u-btn u-btn--primary u-unit-card__cta" href="${UI.esc(DataManager.urlUnidad(unidad.id))}">
                        Entrar a la unidad <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </a>
                </footer>
            </article>`;
    }

    function resumen(unidades) {
        const totalTemas = unidades.reduce((suma, u) => suma + UI.lista(u.temas).length, 0);
        const totalActividades = unidades.reduce((suma, u) => suma + UI.actividades(u).length, 0);
        return [
            UI.plural(unidades.length, 'unidad', 'unidades'),
            UI.plural(totalTemas, 'tema', 'temas'),
            UI.plural(totalActividades, 'actividad', 'actividades')
        ].map(texto => `<span>${texto}</span>`).join('');
    }

    document.addEventListener('DOMContentLoaded', async () => {
        const grid = document.getElementById('grid-unidades');
        const titulo = document.getElementById('catalogoTitulo');
        const descripcion = document.getElementById('catalogoDescripcion');
        const resumenEl = document.getElementById('catalogoResumen');

        UI.iniciarSelectorVista({
            contenedor: grid,
            botones: Array.from(document.querySelectorAll('.u-view-toggle [data-vista]')),
            clave: CLAVE_VISTA,
            vistaPorDefecto: VISTA_POR_DEFECTO
        });

        try {
            const [catalogo, unidades] = await Promise.all([
                DataManager.getCatalogo(),
                DataManager.getUnidades()
            ]);

            if (catalogo.titulo) titulo.textContent = catalogo.titulo;
            if (catalogo.descripcion) descripcion.textContent = catalogo.descripcion;
            resumenEl.innerHTML = resumen(unidades);

            grid.innerHTML = unidades.map(tarjetaUnidad).join('');
            grid.setAttribute('aria-busy', 'false');
        } catch (error) {
            UI.mostrarError(grid, error);
        }
    });
})();
